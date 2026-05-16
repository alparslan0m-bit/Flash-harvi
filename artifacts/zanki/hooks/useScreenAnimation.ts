import { useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Hook to manage the standard fade-in and slide-up animation for screens.
 * Includes automatic scroll-to-top on focus.
 */
export function useScreenAnimation(scrollRef?: React.RefObject<any>) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  useFocusEffect(
    useCallback(() => {
      // Reset and trigger slide-in animation
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Optional: Scroll to top on focus
      if (scrollRef?.current) {
        const timer = setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [fadeAnim, scrollRef])
  );

  return { fadeAnim, translateY };
}
