import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";
import type { Bill, CaptureMethod } from "@/context/ExpenseContext";

const METHOD_META: Record<
  CaptureMethod,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  sms: { icon: "chatbubble-outline", label: "SMS", color: "#15803d" },
  share: { icon: "share-outline", label: "Shared", color: "#0284c7" },
  email: { icon: "mail-outline", label: "Email", color: "#9333ea" },
  camera: { icon: "camera-outline", label: "Scanned", color: "#ea580c" },
  manual: { icon: "create-outline", label: "Manual", color: "#6b7280" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.floor(
    (now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface BillCardProps {
  bill: Bill;
  onPress: () => void;
}

export function BillCard({ bill, onPress }: BillCardProps) {
  const colors = useColors();
  const currency = useCurrency();
  const meta = METHOD_META[bill.captureMethod];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.storeIcon, { backgroundColor: colors.secondary }]}>
        <Text style={styles.storeInitial}>{bill.store.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
          {bill.store}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(bill.date)}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {currency.format(bill.total)}
        </Text>
        <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
          {bill.items.filter((i) => i.category !== "Tax").length} items
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  storeInitial: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#15803d",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  itemCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
