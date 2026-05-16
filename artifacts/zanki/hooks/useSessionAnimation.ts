import { useEffect, useState } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export function useSessionAnimation(masteryRate: number) {
  // Count-up animation
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(masteryRate / 35));
    const timer = setInterval(() => {
      current = Math.min(current + step, masteryRate);
      setDisplayScore(current);
      if (current >= masteryRate) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [masteryRate]);

  // Ring entrance animation
  const ringScale = useSharedValue(0.55);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 16, stiffness: 160 });
    ringOpacity.value = withTiming(1, { duration: 450 });
  }, []);

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return {
    displayScore,
    ringAnimStyle,
  };
}
