import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExpenses, type CaptureMethod } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

const CATEGORY_COLORS: Record<string, string> = {
  Meat: "#fde68a",
  Seafood: "#fed7aa",
  Produce: "#bbf7d0",
  Dairy: "#bfdbfe",
  Grains: "#fef08a",
  Frozen: "#ddd6fe",
  Snacks: "#fbcfe8",
  Drinks: "#a5f3fc",
  Pantry: "#d9f99d",
  Bakery: "#fed7aa",
  Deli: "#f9a8d4",
  Tax: "#e5e7eb",
  Other: "#f3f4f6",
};

const METHOD_META: Record<
  CaptureMethod,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  sms: { icon: "chatbubble-outline", label: "SMS Auto-Scanned", color: "#15803d" },
  share: { icon: "share-outline", label: "Shared Link", color: "#0284c7" },
  email: { icon: "mail-outline", label: "Email Forwarded", color: "#9333ea" },
  camera: { icon: "camera-outline", label: "Photographed", color: "#ea580c" },
  manual: { icon: "create-outline", label: "Manual Entry", color: "#6b7280" },
};

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const currency = useCurrency();
  const insets = useSafeAreaInsets();
  const { bills, familyMembers, removeBill } = useExpenses();

  const bill = bills.find((b) => b.id === id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (!bill) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          Bill not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = METHOD_META[bill.captureMethod];
  const perPersonShare = familyMembers.length > 0 ? bill.total / familyMembers.length : bill.total;
  const nonTaxItems = bill.items.filter((i) => i.category !== "Tax");
  const taxItem = bill.items.find((i) => i.category === "Tax");

  async function handleDelete() {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(
            `Remove ${bill!.store} — ${currency.format(bill!.total)} from your records?`
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Delete bill",
              `Remove ${bill!.store} — ${currency.format(bill!.total)} from your records?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Delete", style: "destructive", onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmed) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await removeBill(bill!.id);
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: topInset + 16 },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>
        <Text style={styles.storeName}>{bill.store}</Text>
        <View style={styles.headerMeta}>
          <View style={[styles.methodBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Ionicons name={meta.icon} size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.methodBadgeText}>{meta.label}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(bill.date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        {/* Totals bar */}
        <View style={styles.totalsBar}>
          {[
            { label: "Items", value: String(nonTaxItems.length) },
            { label: "Tax", value: currency.format(taxItem?.price ?? 0) },
            { label: "Total", value: currency.format(bill.total) },
          ].map((t, i) => (
            <View key={t.label} style={[styles.totalItem, i > 0 && styles.totalItemBorder]}>
              <Text style={styles.totalValue}>{t.value}</Text>
              <Text style={styles.totalLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Family split */}
      {familyMembers.length > 1 && (
        <View style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.splitTitle, { color: colors.mutedForeground }]}>Split between</Text>
          <View style={styles.splitRow}>
            {familyMembers.map((m) => (
              <View key={m.id} style={styles.splitMember}>
                <View style={[styles.memberAvatar, { backgroundColor: m.color + "22" }]}>
                  <Text style={[styles.memberInitials, { color: m.color }]}>{m.initials}</Text>
                </View>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                <Text style={[styles.memberShare, { color: colors.mutedForeground }]}>
                  {currency.format(perPersonShare)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Item list */}
      <FlatList
        data={nonTaxItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 20,
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.itemsTitle, { color: colors.foreground }]}>
            Itemized bill
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.catTag,
                { backgroundColor: CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other },
              ]}
            >
              <Text style={styles.catTagText}>{item.category}</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.qty ? (
                <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>{item.qty}</Text>
              ) : null}
            </View>
            <Text style={[styles.itemPrice, { color: colors.foreground }]}>
              {currency.format(item.price)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: {
    color: "#ffffff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  methodBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  dateText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  totalsBar: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
  },
  totalItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  totalItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.2)",
  },
  totalValue: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  totalLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  splitCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  splitTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: "row",
    gap: 16,
  },
  splitMember: {
    alignItems: "center",
    gap: 4,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitials: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  memberName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  memberShare: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  itemsTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  catTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  itemQty: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
