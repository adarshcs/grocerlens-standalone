import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuotaBanner } from "@/components/QuotaBanner";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function CaptureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { smsMonitoringEnabled, setSmsMonitoringEnabled, emailAddress, addBill, householdId, quota } =
    useExpenses();
  const [emailCopied, setEmailCopied] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [shareUrlInput, setShareUrlInput] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  async function copyEmail() {
    await Clipboard.setStringAsync(emailAddress);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  async function handleScanReceipt() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow access to your photos to scan receipts."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Error", "Could not read image data.");
      return;
    }

    setOcrLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(`${API_BASE}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: asset.mimeType ?? "image/jpeg",
          householdId: householdId ?? undefined,
        }),
      });

      if (response.status === 402) {
        const err = await response.json();
        router.push("/paywall");
        Alert.alert("Scan limit reached", err.message ?? "Upgrade to continue scanning.");
        return;
      }
      if (!response.ok) throw new Error("OCR failed");

      const data = await response.json();
      await addBill({
        store: data.store ?? "Scanned Receipt",
        date: data.date ?? new Date().toISOString().split("T")[0],
        total: data.total ?? 0,
        items: data.items ?? [],
        captureMethod: "camera",
        imageUri: asset.uri,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Receipt added",
        `${data.store ?? "Receipt"} — ₹${(data.total ?? 0).toFixed(2)} added to your bills.`
      );
    } catch {
      Alert.alert(
        "Could not read receipt",
        "Try again or enter the bill manually."
      );
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to photograph receipts.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setOcrLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch(`${API_BASE}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: "image/jpeg",
          householdId: householdId ?? undefined,
        }),
      });
      if (response.status === 402) {
        const err = await response.json();
        router.push("/paywall");
        Alert.alert("Scan limit reached", err.message ?? "Upgrade to continue scanning.");
        return;
      }
      if (!response.ok) throw new Error("OCR failed");
      const data = await response.json();
      await addBill({
        store: data.store ?? "Photographed Receipt",
        date: data.date ?? new Date().toISOString().split("T")[0],
        total: data.total ?? 0,
        items: data.items ?? [],
        captureMethod: "camera",
        imageUri: asset.uri,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Receipt added",
        `${data.store ?? "Receipt"} — ₹${(data.total ?? 0).toFixed(2)} saved!`
      );
    } catch {
      Alert.alert("Could not read receipt", "Try again or upload from gallery.");
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: topInset + 16 },
        ]}
      >
        <Text style={styles.headerTitle}>Add a receipt</Text>
        <Text style={styles.headerSub}>
          Choose how you want to capture your grocery bill
        </Text>
      </View>

      <QuotaBanner label="Bill scans" quota={quota.billScans} isPremium={quota.isPremium} />

      <View style={styles.content}>

        {/* ── Method 1: SMS (Android default) ── */}
        {Platform.OS === "android" && (
          <View
            style={[
              styles.methodCard,
              styles.methodCardPrimary,
              { backgroundColor: colors.primary },
            ]}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Ionicons name="chatbubble-outline" size={22} color="#ffffff" />
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.methodTitleRow}>
                  <Text style={[styles.methodTitle, { color: "#ffffff" }]}>
                    SMS Auto-Scan
                  </Text>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                </View>
                <Text style={[styles.methodDesc, { color: "rgba(255,255,255,0.75)" }]}>
                  Automatically detects grocery receipt links in your SMS inbox
                </Text>
              </View>
            </View>
            <View style={styles.smsToggleRow}>
              <View style={styles.smsStatus}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: smsMonitoringEnabled
                        ? "#86efac"
                        : "rgba(255,255,255,0.3)",
                    },
                  ]}
                />
                <Text style={[styles.smsStatusText, { color: "rgba(255,255,255,0.9)" }]}>
                  {smsMonitoringEnabled ? "Monitoring active" : "Monitoring off"}
                </Text>
              </View>
              <Switch
                value={smsMonitoringEnabled}
                onValueChange={setSmsMonitoringEnabled}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: "#86efac" }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={[styles.infoBox, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.infoText, { color: "rgba(255,255,255,0.7)" }]}>
                Full SMS background scanning activates when you install the production app.
                New receipt links will be added automatically.
              </Text>
            </View>
          </View>
        )}

        {/* ── Method 2: Share a link ── */}
        <View style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.methodHeader}>
            <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="share-social-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>
                Share a link
              </Text>
              <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>
                {Platform.OS === "ios"
                  ? "Tap Share in your SMS or browser, then choose GrocerLens"
                  : "Share any receipt URL directly to GrocerLens from any app"}
              </Text>
            </View>
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>
              {Platform.OS === "ios"
                ? 'Open your grocery receipt SMS → tap the share icon → scroll to "GrocerLens"'
                : 'Open any receipt link → tap share → select GrocerLens from the list'}
            </Text>
          </View>
        </View>

        {/* ── Method 3: Email forwarding ── */}
        <View style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.methodHeader}>
            <View style={[styles.methodIcon, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="mail-outline" size={22} color="#9333ea" />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>
                Forward by email
              </Text>
              <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>
                Set up a forwarding rule once — all future receipt emails auto-sync
              </Text>
            </View>
          </View>
          <View style={[styles.emailBox, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.emailLabel, { color: colors.mutedForeground }]}>
              Your unique address
            </Text>
            <Text style={[styles.emailAddr, { color: colors.foreground }]} numberOfLines={1}>
              {emailAddress}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#9333ea" + "18", borderColor: "#9333ea" }]}
            onPress={copyEmail}
            activeOpacity={0.7}
          >
            <Ionicons
              name={emailCopied ? "checkmark-circle" : "copy-outline"}
              size={16}
              color="#9333ea"
            />
            <Text style={[styles.actionBtnText, { color: "#9333ea" }]}>
              {emailCopied ? "Copied!" : "Copy address"}
            </Text>
          </TouchableOpacity>
          <View style={[styles.infoBox, { backgroundColor: colors.secondary, marginTop: 8 }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              In your email app, create a rule to auto-forward messages from your
              supermarket to this address. We'll parse the receipt and add it automatically.
            </Text>
          </View>
        </View>

        {/* ── Method 4: Camera OCR ── */}
        <View style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.methodHeader}>
            <View style={[styles.methodIcon, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="camera-outline" size={22} color="#ea580c" />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>
                Scan a receipt
              </Text>
              <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>
                Take a photo or upload from gallery — AI reads every line item automatically
              </Text>
            </View>
          </View>
          {ocrLoading ? (
            <View style={styles.ocrLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.ocrLoadingText, { color: colors.mutedForeground }]}>
                Reading your receipt…
              </Text>
            </View>
          ) : (
            <View style={styles.cameraButtons}>
              <TouchableOpacity
                style={[styles.cameraBtn, { backgroundColor: "#ea580c", flex: 1 }]}
                onPress={handleCamera}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
                <Text style={styles.cameraBtnText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cameraBtn,
                  {
                    backgroundColor: "#fff7ed",
                    borderWidth: 1,
                    borderColor: "#ea580c",
                    flex: 1,
                  },
                ]}
                onPress={handleScanReceipt}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={18} color="#ea580c" />
                <Text style={[styles.cameraBtnText, { color: "#ea580c" }]}>
                  Upload image
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.infoBox, { backgroundColor: colors.secondary, marginTop: 8 }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Works with physical receipts and on-screen receipt photos. AI extracts
              every item, category, and price automatically.
            </Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  methodCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  methodCardPrimary: {
    borderWidth: 0,
  },
  methodHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
    gap: 3,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  defaultBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  defaultBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  smsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smsStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  smsStatusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  emailBox: {
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  emailLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emailAddr: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cameraButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cameraBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  ocrLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  ocrLoadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
