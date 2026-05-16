import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function GoogleIcon() {
  return (
    <View style={googleIconStyles.container}>
      <Text style={googleIconStyles.g}>G</Text>
    </View>
  );
}

const googleIconStyles = StyleSheet.create({
  container: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  g: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#4285F4", letterSpacing: -0.5 },
});

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  // Compute the exact redirect URL for this device/environment
  const redirectUrl = Linking.createURL("/auth/callback");

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const fn = mode === "login" ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);

    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)" as any);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error: err, cancelled } = await signInWithGoogle();

    setGoogleLoading(false);
    if (cancelled) {
      return; // User aborted the flow — do nothing
    } else if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={28} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Zanki</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Learn smarter, not harder.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-In */}
          <TouchableOpacity
            style={[
              styles.googleBtn,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Setup helper — tap to reveal the redirect URL to copy */}
          <TouchableOpacity
            style={[
              styles.setupToggle,
              {
                backgroundColor: showSetup ? colors.primary + "1A" : colors.muted,
                borderColor: showSetup ? colors.primary + "33" : colors.border,
              },
            ]}
            onPress={() => setShowSetup((v) => !v)}
          >
            <Feather
              name={showSetup ? "chevron-up" : "info"}
              size={14}
              color={showSetup ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.setupToggleText,
                { color: showSetup ? colors.primary : colors.mutedForeground },
              ]}
            >
              {showSetup ? "Hide Supabase setup" : "Google not working? Tap to see setup"}
            </Text>
          </TouchableOpacity>

          {showSetup && (
            <View style={[styles.setupBox, { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "33" }]}>
              <Text style={styles.setupTitle}>
                Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs:
              </Text>

              {/* Selectable URL box */}
              <TouchableOpacity
                style={styles.urlBox}
                onLongPress={() => {
                  Alert.alert(
                    "Redirect URL",
                    redirectUrl,
                    [{ text: "OK" }]
                  );
                }}
                onPress={() => {
                  Alert.alert(
                    "Copy this URL",
                    redirectUrl,
                    [{ text: "OK" }]
                  );
                }}
              >
                <Text style={styles.urlText} selectable>
                  {redirectUrl}
                </Text>
                <Feather name="copy" size={14} color="#1d4ed8" />
              </TouchableOpacity>

              <Text style={styles.setupNote}>
                Also add:{"\n"}
                • <Text style={styles.monoSmall}>zanki://auth/callback</Text>
                {"\n"}
                • <Text style={styles.monoSmall}>exp://**</Text> (wildcard for Expo Go){"\n\n"}
                Then in Supabase → Auth → Providers → Google, make sure Google is enabled and your OAuth credentials are set.
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email */}
          <View
            style={[
              styles.inputWrap,
              { 
                borderColor: focusedField === "email" ? colors.primary : colors.border, 
                backgroundColor: colors.card,
                borderWidth: focusedField === "email" ? 2 : 1,
              },
            ]}
          >
            <Feather name="mail" size={18} color={focusedField === "email" ? colors.primary : colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputWrap,
              { 
                borderColor: focusedField === "password" ? colors.primary : colors.border, 
                backgroundColor: colors.card,
                borderWidth: focusedField === "password" ? 2 : 1,
              },
            ]}
          >
            <Feather name="lock" size={18} color={focusedField === "password" ? colors.primary : colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={focusedField === "password" ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "33" },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            style={styles.switchRow}
          >
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 36 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -1.2, marginBottom: 6 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", letterSpacing: -0.2 },
  form: { gap: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  setupToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  setupToggleText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  setupBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  setupTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
    lineHeight: 16,
  },
  urlBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    padding: 10,
  },
  urlText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
    lineHeight: 16,
  },
  setupNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    lineHeight: 17,
  },
  monoSmall: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: -0.3 },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
