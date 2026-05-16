// artifacts/mobile/hooks/usePurchase.ts
import { useState, useCallback } from "react";
import { Linking } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

export type PurchaseStatus = "idle" | "loading" | "redirecting" | "verifying" | "success" | "error";

export function usePurchase() {
  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const purchaseModule = useCallback(async (moduleId: string) => {
    setStatus("loading");
    setError(null);

    try {
      // 1. Create Checkout Session via Edge Function
      const successUrl = Linking.createURL("/purchase/success");
      const cancelUrl = Linking.createURL("/purchase/cancel");

      const { data, error: invokeError } = await supabase.functions.invoke("create-checkout", {
        body: {
          module_id: moduleId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });

      if (invokeError || !data?.url) {
        throw new Error(invokeError?.message ?? "Failed to create checkout");
      }

      // 2. Open Stripe Checkout
      setStatus("redirecting");
      const result = await WebBrowser.openAuthSessionAsync(data.url, successUrl);

      if (result.type !== "success") {
        setStatus("idle");
        return { success: false, cancelled: true };
      }

      // 3. Extract session_id from redirect URL
      const url = new URL(result.url);
      const sessionId = url.searchParams.get("session_id");

      if (!sessionId) {
        throw new Error("No session_id in redirect URL");
      }

      // 4. Verify purchase with Edge Function
      setStatus("verifying");
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-purchase",
        { body: { session_id: sessionId } }
      );

      if (verifyError) throw new Error(verifyError.message);

      if (verifyData?.status === "active") {
        // 5. Invalidate access caches so UI updates immediately
        await queryClient.invalidateQueries({ queryKey: ["module_access"] });
        await queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
        await queryClient.invalidateQueries({ queryKey: ["progress"] });
        await queryClient.invalidateQueries({ queryKey: ["stats"] });
        setStatus("success");
        return { success: true, moduleId: verifyData.module_id };
      } else {
        // Payment pending (e.g. bank transfer)
        setStatus("idle");
        return { success: false, pending: true };
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      setError(message);
      setStatus("error");
      return { success: false, error: message };
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { purchaseModule, status, error, reset };
}
