import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSSO, useSignIn } from "@clerk/expo";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  const signInWith = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      const provider = strategy === "oauth_google" ? "google" : "apple";
      setLoadingProvider(provider);
      try {
        if (Platform.OS === "web") {
          // Web: full-page redirect OAuth (works in iframe/preview environments)
          await signIn?.authenticateWithRedirect({
            strategy,
            redirectUrl: `${window.location.origin}/sso-callback`,
            redirectUrlComplete: `${window.location.origin}/`,
          });
          return;
        }
        // Native (iOS/Android): OAuth popup via Expo
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });
        if (createdSessionId) {
          await setActive!({ session: createdSessionId });
        }
      } catch (err) {
        Alert.alert("Sign in failed", "Please try again.");
        console.error(err);
      } finally {
        setLoadingProvider(null);
      }
    },
    [startSSOFlow, signIn]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Ionicons name="cart" size={40} color="#ffffff" />
        </View>
        <Text style={styles.appName}>GrocerLens</Text>
        <Text style={styles.tagline}>Grocery expenses, shared with family</Text>
      </View>

      {/* Feature bullets */}
      <View style={styles.features}>
        {[
          { icon: "people-outline", text: "Share bills with your household" },
          { icon: "bar-chart-outline", text: "Track spending by category" },
          { icon: "sparkles-outline", text: "Get AI-powered saving tips" },
          { icon: "mail-outline", text: "Forward receipts by email" },
        ].map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={18} color="#15803d" />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Auth buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.googleBtn]}
          onPress={() => signInWith("oauth_google")}
          disabled={loadingProvider !== null}
          activeOpacity={0.85}
        >
          {loadingProvider === "google" ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#ffffff" />
              <Text style={styles.btnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[styles.btn, styles.appleBtn]}
            onPress={() => signInWith("oauth_apple")}
            disabled={loadingProvider !== null}
            activeOpacity={0.85}
          >
            {loadingProvider === "apple" ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#ffffff" />
                <Text style={styles.btnText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    paddingTop: 48,
    gap: 12,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#14532d",
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#166534",
    textAlign: "center",
  },
  features: {
    gap: 14,
    paddingVertical: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#14532d",
    flex: 1,
  },
  buttons: {
    gap: 12,
  },
  btn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleBtn: {
    backgroundColor: "#15803d",
  },
  appleBtn: {
    backgroundColor: "#111827",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
  },
});
