// artifacts/mobile/hooks/useMyPurchases.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Purchase {
  id: string;
  module_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

async function fetchMyPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, module_id, amount_cents, currency, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export function useMyPurchases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_purchases", user?.id],
    queryFn: fetchMyPurchases,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "offlineFirst",
  });
}
