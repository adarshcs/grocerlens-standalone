import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { Alert } from "react-native";

try {
  initializeRevenueCat();
} catch (err: any) {
  Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    function handleUrl({ url }: { url: string }) {
      const match =
        url.match(/[/=]join[/=?]([A-Za-z0-9]{4,8})/i) ||
        url.match(/code[=:]([A-Za-z0-9]{4,8})/i);
      if (match) {
        router.push(`/join?code=${match[1].toUpperCase()}`);
      }
    }

    Linking.getInitialURL()
      .then((url) => { if (url) handleUrl({ url }); })
      .catch(() => {});

    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, [router]);

  return null;
}

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();

  const inAuthGroup = segments[0] === "(auth)";

  if (!isLoaded) return null;

  if (!isSignedIn && !inAuthGroup) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isSignedIn && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="bill/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="join"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="category/[name]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="sso-callback"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <SubscriptionProvider>
                    <ExpenseProvider>
                      <AuthGate />
                      <DeepLinkHandler />
                      <RootLayoutNav />
                    </ExpenseProvider>
                  </SubscriptionProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
