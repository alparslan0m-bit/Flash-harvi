import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Subscribes to NetInfo and keeps React Query's onlineManager in sync.
 * Returns a stable `isOnline` boolean that components can use.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
