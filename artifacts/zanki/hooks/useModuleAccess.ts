// artifacts/mobile/hooks/useModuleAccess.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface ContentAccessEntry {
  item_id: string;
  item_type: 'module' | 'subject';
  has_access: boolean;
  is_free: boolean;
  price_cents: number;
}

async function fetchContentAccess(): Promise<Map<string, ContentAccessEntry>> {
  const { data, error } = await supabase.rpc("get_content_access_map");
  if (error) throw error;

  const map = new Map<string, ContentAccessEntry>();
  for (const row of (data ?? []) as ContentAccessEntry[]) {
    map.set(row.item_id, row);
  }
  return map;
}

export function useModuleAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content_access", user?.id],
    queryFn: fetchContentAccess,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,    // 5 min — invalidated after purchase
    gcTime: 1000 * 60 * 60,
    networkMode: "offlineFirst",
    retry: 1,
  });
}
