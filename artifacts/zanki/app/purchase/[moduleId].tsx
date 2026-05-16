// artifacts/mobile/app/purchase/[moduleId].tsx
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePurchase } from "@/hooks/usePurchase";
import { useColors } from "@/hooks/useColors";

export default function PurchaseScreen() {
  const { moduleId, moduleName, priceDisplay } = useLocalSearchParams<{
    moduleId: string;
    moduleName: string;
    priceDisplay: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { purchaseModule, status, error } = usePurchase();

  const handlePurchase = async () => {
    const result = await purchaseModule(moduleId);
    if (result.success) {
      router.back();
    }
  };

  const isLoading = status === "loading" || status === "redirecting" || status === "verifying";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
          <Feather name="package" size={40} color={colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: colors.foreground }]}>{moduleName}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Unlock all lectures and flashcards for this module forever.
        </Text>
        
        <Text style={[styles.price, { color: colors.primary }]}>{priceDisplay}</Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {status === "success" ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={40} color={colors.success} />
            <Text style={[styles.successText, { color: colors.foreground }]}>
              Purchase complete! You now have full access.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handlePurchase}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="credit-card" size={18} color="#fff" />
                <Text style={styles.btnText}>
                  {status === "verifying" ? "Verifying payment..." : "Purchase Now"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Secure payment processed by Stripe.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
    marginTop: -40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { 
    fontSize: 32, 
    fontFamily: "Nunito_800ExtraBold", 
    letterSpacing: -1, 
    textAlign: "center" 
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  price: { 
    fontSize: 48, 
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  btn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    paddingVertical: 18, 
    paddingHorizontal: 40, 
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  error: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  successBox: { alignItems: "center", gap: 12 },
  successText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  }
});
