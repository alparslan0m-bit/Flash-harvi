import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

const FEEDBACK_MIN = 1;
const FEEDBACK_MAX = 500;
const COOLDOWN_SECS = 60;

function sanitize(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export function useFeedback(userId: string | undefined) {
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldownSecs(COOLDOWN_SECS);
    cooldownRef.current = setInterval(() => {
      setCooldownSecs((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const updateText = (t: string) => {
    setFeedbackText(t.slice(0, FEEDBACK_MAX));
    if (feedbackError) setFeedbackError(null);
  };

  const handleSubmit = async () => {
    const clean = sanitize(feedbackText);

    if (clean.length < FEEDBACK_MIN) {
      setFeedbackError(`Please write at least ${FEEDBACK_MIN} characters.`);
      return;
    }
    if (clean.length > FEEDBACK_MAX) {
      setFeedbackError(`Feedback must be under ${FEEDBACK_MAX} characters.`);
      return;
    }
    if (cooldownSecs > 0) return;
    if (!userId) {
      setFeedbackError("You must be signed in to submit feedback.");
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedbackError(null);

    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      content: clean,
    });

    setSubmitting(false);

    if (!error) {
      setFeedbackText("");
      setFeedbackSent(true);
      setFeedbackError(null);
      startCooldown();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setFeedbackSent(false), 3000);
    } else {
      setFeedbackError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isDisabled = submitting || cooldownSecs > 0;
  const isTooShort = feedbackText.trim().length < FEEDBACK_MIN;

  return {
    feedbackText,
    updateText,
    submitting,
    feedbackSent,
    feedbackError,
    cooldownSecs,
    isDisabled,
    isTooShort,
    handleSubmit,
  };
}
