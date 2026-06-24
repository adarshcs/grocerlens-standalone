import { useSSO } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

// MUST be called here — this is the screen Android opens when it receives
// the grocerlens://sso-callback deep link after OAuth. Without this,
// WebBrowser.openAuthSessionAsync (used internally by startSSOFlow) never
// knows the redirect completed and the auth loop happens.
WebBrowser.maybeCompleteAuthSession();

export default function SSOCallback() {
  const { handleRedirectCallback } = useSSO();

  useEffect(() => {
    // For the startSSOFlow path, maybeCompleteAuthSession() above already
    // signals completion. handleRedirectCallback handles the web redirect
    // path. Either way, AuthGate in _layout.tsx drives navigation once
    // isSignedIn flips — we never manually redirect to sign-in here.
    handleRedirectCallback({
      afterSignInUrl: "/(tabs)",
      afterSignUpUrl: "/(tabs)",
    }).catch(() => {
      // Intentionally suppressed: if handleRedirectCallback fails it means
      // startSSOFlow already handled the session. AuthGate will route
      // correctly once the session resolves.
    });
  }, [handleRedirectCallback]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0fdf4",
      }}
    >
      <ActivityIndicator size="large" color="#15803d" />
    </View>
  );
}
