import { useSSO } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function SSOCallback() {
  const { handleRedirectCallback } = useSSO();
  const router = useRouter();

  useEffect(() => {
    handleRedirectCallback({
      afterSignInUrl: "/(tabs)",
      afterSignUpUrl: "/(tabs)",
    }).catch(() => {
      router.replace("/(auth)/sign-in");
    });
  }, [handleRedirectCallback, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4" }}>
      <ActivityIndicator size="large" color="#15803d" />
    </View>
  );
}
