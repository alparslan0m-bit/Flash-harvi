import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserCard } from "@/types";

export function useUserCards(userId?: string) {
  return useQuery({
    queryKey: ["user_cards", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", userId);
        
      if (error) throw error;
      return data as UserCard[];
    },
    enabled: !!userId,
    // Keep user cards relatively fresh, but rely on manual invalidation 
    // after a session to trigger an immediate refetch.
    staleTime: 5 * 60 * 1000, 
  });
}
