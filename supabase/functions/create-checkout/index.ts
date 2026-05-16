// supabase/functions/create-checkout/index.ts
// SECURITY HARDENING (2026-05-11):
//   CRIT-02: Insert as 'pending', never 'active' — only webhook activates
//   Added: Duplicate purchase check, environment-gated manual bypass, input validation
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // ── 1. Authenticate ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseAnon.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate Input ───────────────────────────────────────
    const { module_id, subject_id, success_url, cancel_url } = await req.json();
    if ((!module_id && !subject_id) || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 2.5 Rate Limit Check (Denial of Wallet Prevention) ───────
    // Allow up to 20 checkouts per minute (supports buying all 12 modules of a year rapidly)
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    const { count: recentPendingCount } = await supabaseAdmin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("created_at", oneMinuteAgo);

    if (recentPendingCount !== null && recentPendingCount >= 20) {
      return new Response(
        JSON.stringify({ error: "Too many checkout requests. Please wait a few minutes." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Determine target and validate it exists ──────────────
    const targetTable = subject_id ? "subjects" : "modules";
    const targetId = subject_id || module_id;
    const targetColumn = subject_id ? "subject_id" : "module_id";

    const { data: item, error: itemError } = await supabaseAdmin
      .from(targetTable)
      .select("price_cents, external_price_id, is_free, name")
      .eq("id", targetId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (item.is_free) {
      return new Response(
        JSON.stringify({ error: "Item is free — no purchase needed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!item.price_cents || item.price_cents <= 0) {
      return new Response(
        JSON.stringify({ error: "Item has no valid price configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 4. Check for existing active purchase (prevent duplicates) ─
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq(targetColumn, targetId)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (existing?.status === "active") {
      return new Response(
        JSON.stringify({ error: "You already have access to this content" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If there's a stale pending purchase, clean it up before creating a new one
    if (existing?.status === "pending") {
      await supabaseAdmin
        .from("purchases")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    // ── 5. Create Payment Session ───────────────────────────────
    const isDev = Deno.env.get("ENVIRONMENT") === "development";
    const paymentSessionId = isDev
      ? `dev_${crypto.randomUUID()}`
      : `stripe_${crypto.randomUUID()}`; // Replace with real Stripe session creation

    // ── 6. Record the Purchase as PENDING ───────────────────────
    // CRIT-02 FIX: Status is ALWAYS 'pending'. Only the payment webhook
    // (after HMAC verification) may set it to 'active'.
    const { error: insertError } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: user.id,
        module_id: module_id || null,
        subject_id: subject_id || null,
        payment_session_id: paymentSessionId,
        amount_cents: item.price_cents,
        currency: "usd",
        status: "pending",
        provider: isDev ? "manual" : "stripe",
      });

    if (insertError) {
      console.error("[CreateCheckout DB Error]:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Failed to create purchase record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 7. Build checkout URL ───────────────────────────────────
    // In dev mode: redirect to success immediately (for testing only)
    // In production: this would be a real Stripe checkout URL
    let checkoutUrl: string;
    if (isDev) {
      checkoutUrl = `${success_url}?session_id=${paymentSessionId}`;

      // DEV ONLY: auto-activate for testing convenience
      await supabaseAdmin
        .from("purchases")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("payment_session_id", paymentSessionId)
        .eq("user_id", user.id);
    } else {
      // TODO: Create real Stripe Checkout session here
      // const stripeSession = await stripe.checkout.sessions.create({...});
      // checkoutUrl = stripeSession.url;
      checkoutUrl = `${success_url}?session_id=${paymentSessionId}`;
    }

    return new Response(
      JSON.stringify({ url: checkoutUrl, session_id: paymentSessionId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[CreateCheckout Error]:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
