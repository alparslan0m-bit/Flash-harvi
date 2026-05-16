import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function getRingColor(
  mastery: number,
  colors: ReturnType<typeof useColors>,
): string {
  if (mastery >= 80) return colors.success;
  if (mastery >= 60) return colors.warning;
  return colors.destructive;
}

export function getGrade(mastery: number): string {
  if (mastery >= 90) return "A";
  if (mastery >= 80) return "B";
  if (mastery >= 70) return "C";
  if (mastery >= 60) return "D";
  return "F";
}

export function getTitle(mastery: number): {
  text: string;
  icon: React.ComponentProps<typeof Feather>["name"];
} {
  if (mastery >= 90) return { text: "Outstanding", icon: "star" };
  if (mastery >= 80) return { text: "Well done", icon: "award" };
  if (mastery >= 70) return { text: "Good effort", icon: "trending-up" };
  if (mastery >= 60) return { text: "Keep going", icon: "book-open" };
  return { text: "Keep practising", icon: "book-open" };
}
