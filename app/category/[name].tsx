import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Bill } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

const CATEGORY_COLORS: Record<string, string> = {
  Meat: "#ef4444",
  Seafood: "#f97316",
  Produce: "#22c55e",
  Dairy: "#3b82f6",
  Grains: "#f59e0b",
  Frozen: "#a78bfa",
  Snacks: "#f472b6",
  Drinks: "#06b6d4",
  Pantry: "#84cc16",
  Bakery: "#fb923c",
  Deli: "#e879f9",
  Other: "#6b7280",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other;
}

function filterBillsByPeriod(bills: Bill[], period: string): Bill[] {
  const now = new Date();
  return bills.filter((b) => {
    const date = new Date(b.date);
    if (period === "Day") {
      return date.toDateString() === now.toDateString();
    } else if (period === "Week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    } else if (period === "Month") {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    } else if (period === "Year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

export default function CategoryDetailScreen() {
  const { name, period = "Month" } = useLocalSearchParams<{
    name: string;
    period: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const currency = useCurrency();
  const insets = useSafeAreaInsets();
  const { bills } = useExpenses();

  const catColor = getCategoryColor(name ?? "");

  const filteredBills = useMemo(
    () => filterBillsByPeriod(bills, period),
    [bills, period]
  );

  // Bills that have at least one item in this category
  const billsWithCategory = useMemo(
    () =>
      filteredBills
        .map((b) => ({
          ...b,
          items: b.items.filter((i) => i.category === name),
        }))
        .filter((b) => b.items.length > 0)
        .sort((a, b) => b.addedAt - a.addedAt),
    [filteredBills, name]
  );

  const totalSpent = useMemo(
    () => billsWithCategory.reduce((s, b) => s + b.items.reduce((si, i) => si + i.price, 0), 0),
    [billsWithCategory]
  );

  const totalItems = useMemo(
    () => billsWithCategory.reduce((s, b) => s + b.items.length, 0),
    [billsWithCategory]
  );

  // Top items within this category
  const topItems = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    billsWithCategory.forEach((b) => {
      b.items.forEach((i) => {
        const key = i.name.toLowerCase();
        if (!map[key]) map[key] = { name: i.name, total: 0, count: 0 };
        map[key].total += i.price;
        map[key].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [billsWithCategory]);

  const periodLabel =
    period === "Day"
      ? "today"
      : period === "Week"
      ? "this week"
      : period === "Month"
      ? "this month"
      : "this year";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 60,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: catColor, paddingTop: insets.top + 12 },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerCategory}>{name}</Text>
          <Text style={styles.headerAmount}>{currency.format(totalSpent)}</Text>
          <Text style={styles.headerSub}>
            {totalItems} item{totalItems !== 1 ? "s" : ""} across{" "}
            {billsWithCategory.length} trip{billsWithCategory.length !== 1 ? "s" : ""}{" "}
            {periodLabel}
          </Text>
        </View>
      </View>

      {billsWithCategory.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No {name?.toLowerCase()} purchases {periodLabel}
          </Text>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          {/* Top items breakdown */}
          {topItems.length > 1 && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                What you bought
              </Text>
              {topItems.map((item, i) => (
                <View key={item.name}>
                  {i > 0 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                  <View style={styles.topItemRow}>
                    <View style={styles.topItemLeft}>
                      <View
                        style={[styles.rankBadge, { backgroundColor: `${catColor}22` }]}
                      >
                        <Text style={[styles.rankText, { color: catColor }]}>
                          #{i + 1}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[styles.topItemName, { color: colors.foreground }]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.topItemCount,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Bought {item.count}×
                          {item.count > 1
                            ? ` · avg ${currency.format(item.total / item.count)}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.topItemTotal, { color: catColor }]}>
                      {currency.format(item.total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Bills breakdown */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            BY SHOPPING TRIP
          </Text>
          {billsWithCategory.map((bill) => {
            const billCatTotal = bill.items.reduce((s, i) => s + i.price, 0);
            const date = new Date(bill.date);
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <TouchableOpacity
                key={bill.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(`/bill/${bill.id}`)}
                activeOpacity={0.75}
              >
                {/* Bill header */}
                <View style={styles.billHeader}>
                  <View
                    style={[
                      styles.storeIcon,
                      { backgroundColor: `${catColor}22` },
                    ]}
                  >
                    <Text style={[styles.storeInitial, { color: catColor }]}>
                      {bill.store[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, { color: colors.foreground }]}>
                      {bill.store}
                    </Text>
                    <Text
                      style={[styles.billDate, { color: colors.mutedForeground }]}
                    >
                      {dateStr}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.billCatTotal, { color: catColor }]}>
                      {currency.format(billCatTotal)}
                    </Text>
                    <Text
                      style={[styles.billItemCount, { color: colors.mutedForeground }]}
                    >
                      {bill.items.length} item{bill.items.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                {/* Items in this category from this bill */}
                <View
                  style={[styles.itemList, { borderTopColor: colors.border }]}
                >
                  {bill.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={[styles.itemDot, { backgroundColor: catColor }]} />
                      <Text
                        style={[styles.itemName, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.qty ? (
                        <Text
                          style={[
                            styles.itemQty,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {item.qty}
                        </Text>
                      ) : null}
                      <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                        {currency.format(item.price)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.viewFullRow}>
                  <Text style={[styles.viewFullText, { color: catColor }]}>
                    View full bill
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={catColor} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerContent: { gap: 4 },
  headerCategory: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerAmount: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "white",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    padding: 14,
    paddingBottom: 10,
  },
  divider: { height: 1, marginHorizontal: 14 },
  topItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  topItemLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  topItemName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  topItemCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  topItemTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  billHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    paddingBottom: 12,
  },
  storeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  storeInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  storeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  billDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  billCatTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  billItemCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemList: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  itemQty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  itemPrice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  viewFullRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    padding: 10,
    paddingTop: 8,
  },
  viewFullText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
