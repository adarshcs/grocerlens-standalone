import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FamilyMemberCard } from "@/components/FamilyMemberCard";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const currency = useCurrency();
  const router = useRouter();
  const {
    familyMembers,
    bills,
    removeFamilyMember,
    totalThisMonth,
    inviteCode,
    householdId,
    deviceId,
  } = useExpenses();

  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const inviteLink = inviteCode
    ? `${API_BASE}/api/invite/${inviteCode}`
    : null;

  const inviteMessage = inviteCode
    ? `Hey! I'm tracking our grocery expenses with GrocerLens. Join my household to see and add bills together!\n\nTap to join: ${inviteLink}\n\nOr enter code ${inviteCode} in GrocerLens → Family tab 🛒`
    : "";

  async function handleCopyCode() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Link copied!", "Share this link with your household member.");
  }

  async function handleWhatsAppSend() {
    const phone = whatsappPhone.replace(/\D/g, "");
    if (!phone || phone.length < 7) {
      Alert.alert("Invalid number", "Please enter a valid phone number.");
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(inviteMessage)}`;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      setWhatsappPhone("");
      setShowWhatsApp(false);
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
      setWhatsappPhone("");
      setShowWhatsApp(false);
    } else {
      Alert.alert("WhatsApp not found", "Please make sure WhatsApp is installed on your device.");
    }
  }

  async function handleEmailSend() {
    if (!emailAddr || !emailAddr.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    const subject = encodeURIComponent("Join my GrocerLens household!");
    const body = encodeURIComponent(inviteMessage);
    const url = `mailto:${emailAddr}?subject=${subject}&body=${body}`;
    Linking.openURL(url);
    setEmailAddr("");
    setShowEmail(false);
  }

  async function handleJoinWithCode() {
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert("Invalid code", "Please enter the 6-character invite code.");
      return;
    }
    router.push(`/join?code=${code}`);
  }

  function handleRemoveMember(id: string, name: string) {
    Alert.alert(
      "Remove member?",
      `Remove ${name} from the household?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeFamilyMember(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }

  const stats = [
    { label: "Members", value: String(familyMembers.length) },
    { label: "Bills tracked", value: String(bills.length) },
    {
      label: "This month",
      value: currency.format(totalThisMonth),
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, backgroundColor: "#15803d" },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>HOUSEHOLD</Text>
            <Text style={styles.headerTitle}>Family</Text>
          </View>
          {inviteCode && (
            <TouchableOpacity
              style={styles.codeBadge}
              onPress={handleCopyCode}
              activeOpacity={0.75}
            >
              <Ionicons
                name={copiedCode ? "checkmark" : "key-outline"}
                size={13}
                color="#15803d"
              />
              <Text style={styles.codeBadgeText}>
                {copiedCode ? "Copied!" : inviteCode}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* ─── Invite Section ─── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Invite to Household
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Share your code so family members can join and see all grocery bills together.
          </Text>

          {/* Invite code display */}
          {inviteCode && (
            <View style={[styles.inviteCodeBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
              <Text style={styles.inviteCodeLabel}>YOUR INVITE CODE</Text>
              <Text style={styles.inviteCodeValue}>{inviteCode}</Text>
              <View style={styles.inviteCodeActions}>
                <TouchableOpacity
                  style={[styles.codeActionBtn, { backgroundColor: "#dcfce7" }]}
                  onPress={handleCopyCode}
                >
                  <Ionicons
                    name={copiedCode ? "checkmark-circle" : "copy-outline"}
                    size={16}
                    color="#15803d"
                  />
                  <Text style={[styles.codeActionText, { color: "#15803d" }]}>
                    {copiedCode ? "Copied!" : "Copy code"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.codeActionBtn, { backgroundColor: "#dcfce7" }]}
                  onPress={handleCopyLink}
                >
                  <Ionicons name="link-outline" size={16} color="#15803d" />
                  <Text style={[styles.codeActionText, { color: "#15803d" }]}>Copy link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* WhatsApp invite */}
          <TouchableOpacity
            style={[
              styles.inviteMethodBtn,
              { backgroundColor: showWhatsApp ? "#dcfce7" : "#f0fdf4", borderColor: "#86efac" },
            ]}
            onPress={() => { setShowWhatsApp(!showWhatsApp); setShowEmail(false); }}
            activeOpacity={0.8}
          >
            <View style={styles.inviteMethodRow}>
              <View style={[styles.inviteMethodIcon, { backgroundColor: "#25D366" }]}>
                <Ionicons name="logo-whatsapp" size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteMethodTitle, { color: colors.foreground }]}>
                  Send via WhatsApp
                </Text>
                <Text style={[styles.inviteMethodSub, { color: colors.mutedForeground }]}>
                  Opens WhatsApp with a pre-written invite
                </Text>
              </View>
              <Ionicons
                name={showWhatsApp ? "chevron-up" : "chevron-forward"}
                size={18}
                color={colors.mutedForeground}
              />
            </View>
            {showWhatsApp && (
              <View style={styles.inviteInputWrap}>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 15, marginRight: 4 }}>
                    +
                  </Text>
                  <TextInput
                    style={[styles.inlineInput, { color: colors.foreground }]}
                    placeholder="Phone number (with country code)"
                    placeholderTextColor={colors.mutedForeground}
                    value={whatsappPhone}
                    onChangeText={setWhatsappPhone}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: "#25D366" }]}
                  onPress={handleWhatsAppSend}
                >
                  <Ionicons name="send" size={16} color="white" />
                  <Text style={styles.sendBtnText}>Send Invite</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          {/* Email invite */}
          <TouchableOpacity
            style={[
              styles.inviteMethodBtn,
              { backgroundColor: showEmail ? "#ede9fe" : "#f5f3ff", borderColor: "#c4b5fd" },
            ]}
            onPress={() => { setShowEmail(!showEmail); setShowWhatsApp(false); }}
            activeOpacity={0.8}
          >
            <View style={styles.inviteMethodRow}>
              <View style={[styles.inviteMethodIcon, { backgroundColor: "#7c3aed" }]}>
                <Ionicons name="mail" size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteMethodTitle, { color: colors.foreground }]}>
                  Send via Email
                </Text>
                <Text style={[styles.inviteMethodSub, { color: colors.mutedForeground }]}>
                  Opens your email app with an invite message
                </Text>
              </View>
              <Ionicons
                name={showEmail ? "chevron-up" : "chevron-forward"}
                size={18}
                color={colors.mutedForeground}
              />
            </View>
            {showEmail && (
              <View style={styles.inviteInputWrap}>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name="at" size={16} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                  <TextInput
                    style={[styles.inlineInput, { color: colors.foreground }]}
                    placeholder="their@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={emailAddr}
                    onChangeText={setEmailAddr}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: "#7c3aed" }]}
                  onPress={handleEmailSend}
                >
                  <Ionicons name="send" size={16} color="white" />
                  <Text style={styles.sendBtnText}>Send Invite</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Join Another Household ─── */}
        <TouchableOpacity
          style={[styles.joinSection, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowJoin(!showJoin)}
          activeOpacity={0.8}
        >
          <View style={styles.joinRow}>
            <Ionicons name="enter-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.joinText, { color: colors.foreground }]}>
              Have an invite code? Join another household
            </Text>
            <Ionicons
              name={showJoin ? "chevron-up" : "chevron-forward"}
              size={18}
              color={colors.mutedForeground}
            />
          </View>
          {showJoin && (
            <View style={styles.inviteInputWrap}>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.inlineInput, { color: colors.foreground, letterSpacing: 3, fontWeight: "700" }]}
                  placeholder="XXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                  value={joinCodeInput}
                  onChangeText={(t) => setJoinCodeInput(t.toUpperCase().slice(0, 6))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: "#15803d" }]}
                onPress={handleJoinWithCode}
              >
                <Ionicons name="people" size={16} color="white" />
                <Text style={styles.sendBtnText}>Join Household</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Members ─── */}
        <View style={styles.membersHeader}>
          <Text style={[styles.membersTitle, { color: colors.foreground }]}>
            Members ({familyMembers.length})
          </Text>
        </View>

        <View style={[styles.membersList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {familyMembers.map((member, i) => (
            <React.Fragment key={member.id}>
              {i > 0 && (
                <View style={[styles.memberDivider, { backgroundColor: colors.border }]} />
              )}
              <FamilyMemberCard
                member={member}
                bills={bills}
                onRemove={
                  !member.isOwner
                    ? () => handleRemoveMember(member.id, member.name)
                    : undefined
                }
              />
            </React.Fragment>
          ))}
        </View>

        {/* ─── Stats ─── */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "white",
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
  },
  codeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
    letterSpacing: 1.5,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  inviteCodeBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  inviteCodeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#6b7280",
  },
  inviteCodeValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#15803d",
    letterSpacing: 6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  inviteCodeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  codeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  codeActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inviteMethodBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  inviteMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inviteMethodTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  inviteMethodSub: {
    fontSize: 12,
  },
  inviteInputWrap: {
    marginTop: 12,
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  joinSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  joinText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  membersTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  membersList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  memberDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
