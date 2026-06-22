import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface HouseholdPreview {
  householdId: string;
  inviteCode: string;
  ownerName: string;
  memberCount: number;
  billCount: number;
}

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const colors = useColors();
  const { joinHousehold, deviceId } = useExpenses();

  const [preview, setPreview] = useState<HouseholdPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!code) {
      setPreviewError("Missing invite code.");
      setLoadingPreview(false);
      return;
    }
    fetch(`${API_BASE}/api/households/code/${code.toUpperCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setPreviewError("This invite code is invalid or has expired.");
        } else {
          setPreview(data);
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start();
        }
      })
      .catch(() => setPreviewError("Couldn't reach the server. Check your connection."))
      .finally(() => setLoadingPreview(false));
  }, [code]);

  async function handleJoin() {
    if (!name.trim()) {
      setJoinError("Please enter your name.");
      return;
    }
    if (!preview) return;
    setJoining(true);
    setJoinError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await joinHousehold(preview.inviteCode, name.trim());
    setJoining(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      setJoinError(result.error ?? "Failed to join. Please try again.");
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: "#dcfce7" }]}>
            <Text style={styles.iconEmoji}>🏠</Text>
          </View>

          {loadingPreview ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color="#15803d" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Looking up invite code…
              </Text>
            </View>
          ) : previewError ? (
            <View style={styles.centerBlock}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={[styles.errorTitle, { color: colors.foreground }]}>Invalid invite</Text>
              <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
                {previewError}
              </Text>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: "#15803d" }]}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.doneBtnText}>Go to App</Text>
              </TouchableOpacity>
            </View>
          ) : preview ? (
            <Animated.View
              style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
            >
              <Text style={[styles.title, { color: colors.foreground }]}>
                You're invited!
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {preview.ownerName}
                </Text>{" "}
                has invited you to join their household on GrocerLens.
              </Text>

              {/* Household card */}
              <View style={[styles.householdCard, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
                <View style={styles.householdRow}>
                  <View>
                    <Text style={styles.cardLabel}>Members</Text>
                    <Text style={[styles.cardValue, { color: "#15803d" }]}>
                      {preview.memberCount}
                    </Text>
                  </View>
                  <View style={[styles.dividerV, { backgroundColor: "#86efac" }]} />
                  <View>
                    <Text style={styles.cardLabel}>Bills tracked</Text>
                    <Text style={[styles.cardValue, { color: "#15803d" }]}>
                      {preview.billCount}
                    </Text>
                  </View>
                  <View style={[styles.dividerV, { backgroundColor: "#86efac" }]} />
                  <View>
                    <Text style={styles.cardLabel}>Code</Text>
                    <Text style={[styles.cardValue, { color: "#15803d", fontSize: 18, letterSpacing: 2 }]}>
                      {preview.inviteCode}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Name input */}
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                What should we call you?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: joinError ? "#ef4444" : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Your name (e.g. Alex)"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={(t) => { setName(t); setJoinError(null); }}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleJoin}
              />
              {joinError && (
                <Text style={styles.fieldError}>{joinError}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.joinBtn,
                  { backgroundColor: joining ? "#86efac" : "#15803d" },
                ]}
                onPress={handleJoin}
                disabled={joining}
                activeOpacity={0.85}
              >
                {joining ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="people" size={20} color="white" />
                    <Text style={styles.joinBtnText}>Join Household</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                You'll be able to view and add grocery bills shared with this household.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    marginBottom: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  iconEmoji: { fontSize: 36 },
  centerBlock: { alignItems: "center", paddingTop: 40, gap: 16 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  errorBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  doneBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 10 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  householdCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
  },
  householdRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  dividerV: { width: 1, height: 40 },
  cardLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: "800" },
  inputLabel: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  fieldError: { color: "#ef4444", fontSize: 13, marginBottom: 12 },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  joinBtnText: { color: "white", fontWeight: "700", fontSize: 17 },
  disclaimer: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
