import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFeedback } from "@/hooks/useFeedback";
import { useColors } from "@/hooks/useColors";

interface FeedbackFormProps {
  userId?: string;
}

/**
 * A self-contained feedback form component.
 * Extracted from ProfileScreen.
 */
export function FeedbackForm({ userId }: FeedbackFormProps) {
  const colors = useColors();
  const {
    feedbackText,
    updateText,
    submitting,
    feedbackSent,
    feedbackError,
    cooldownSecs,
    isDisabled,
    isTooShort,
    handleSubmit,
  } = useFeedback(userId);
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.headerIconWrap,
            { backgroundColor: colors.primary + "1A" },
          ]}
        >
          <Feather name="message-square" size={14} color={colors.primary} />
        </View>
        <Text style={[styles.headerLabel, { color: colors.foreground }]}>
          Feedback
        </Text>
      </View>
      <View style={styles.inputArea}>
        <TextInput
          style={[
            styles.textarea,
            {
              color: colors.foreground,
              borderColor: feedbackError
                ? colors.destructive + "4D"
                : isFocused
                  ? colors.primary
                  : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          placeholder="Share your thoughts, report a bug, or suggest a feature…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          value={feedbackText}
          onChangeText={updateText}
          textAlignVertical="top"
          maxLength={500}
          editable={!isDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        <Text
          style={[
            styles.charCount,
            {
              color:
                feedbackText.length >= 480
                  ? colors.destructive
                  : feedbackText.length >= 400
                    ? colors.warning
                    : colors.mutedForeground,
            },
          ]}
        >
          {feedbackText.length} / 500
        </Text>
      </View>

      {feedbackSent && (
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: colors.success + "1A",
              borderColor: colors.success + "33",
            },
          ]}
        >
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={[styles.alertText, { color: colors.foreground }]}>
            Feedback sent — thank you!
          </Text>
        </View>
      )}

      {feedbackError && (
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: colors.destructive + "1A",
              borderColor: colors.destructive + "33",
            },
          ]}
        >
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text
            style={[styles.alertText, { color: colors.foreground, flex: 1 }]}
            numberOfLines={3}
          >
            {feedbackError}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          {
            backgroundColor:
              isDisabled || isTooShort ? colors.muted : colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handleSubmit}
        disabled={isDisabled || isTooShort}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : cooldownSecs > 0 ? (
          <View style={styles.cooldownContainer}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text
              style={[styles.submitBtnText, { color: colors.mutedForeground }]}
            >
              Wait {cooldownSecs}s
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.submitBtnText,
              { color: isTooShort ? colors.mutedForeground : "#fff" },
            ]}
          >
            Submit Feedback
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, marginBottom: 24, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  inputArea: { position: "relative" },
  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    paddingBottom: 32,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    minHeight: 120,
    lineHeight: 24,
  },
  charCount: {
    position: "absolute",
    bottom: 8,
    right: 12,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cooldownContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
});
