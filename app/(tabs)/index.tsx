import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BillCard } from "@/components/BillCard";
import { CategoryBar } from "@/components/CategoryBar";
import { SummaryCard } from "@/components/SummaryCard";
import { type Bill } from "@/context/ExpenseContext";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

type Period = "Day" | "Week" | "Month" | "Year";

function filterBillsByPeriod(bills: Bill[], period: Period): Bill[] {
  const now = new Date();
  return bills.filter((b) => {
    const date = new Date(b.date);
    if (period === "Day") return date.toDateString() === now.toDateString();
    if (period === "Week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (period === "Month")
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === "Year") return date.getFullYear() === now.getFullYear();
    return true;
  });
}

export default function DashboardScreen() {
  const colors = useColors();
  const currency = useCurrency();
  const insets = useSafeAreaInsets();
  const { bills, familyMembers, totalThisMonth, totalLastMonth, isLoading } =
    useExpenses();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Month");

  const filteredBills = useMemo(
    () => filterBillsByPeriod(bills, selectedPeriod),
    [bills, selectedPeriod]
  );

  const filteredCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredBills.forEach((b) => {
      b.items
        .filter((i) => i.category !== "Tax")
        .forEach((item) => {
          totals[item.category] = (totals[item.category] ?? 0) + item.price;
        });
    });
    return totals;
  }, [filteredBills]);

  const recentBills = bills.slice(0, 3);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: topInset + 16 },
        ]}
      >
        <View>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
          <Text style={styles.headerTitle}>GrocerLens</Text>
        </View>
        <View style={styles.avatarRow}>
          {familyMembers.slice(0, 3).map((m, i) => (
            <View
              key={m.id}
              style={[
                styles.avatar,
                { backgroundColor: m.color, marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i },
              ]}
            >
              <Text style={styles.avatarText}>{m.initials}</Text>
            </View>
          ))}
          {familyMembers.length < 4 && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/family")}
              style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)", marginLeft: -10 }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary card */}
      <View style={{ marginTop: -1, backgroundColor: colors.primary, paddingBottom: 24 }}>
        <SummaryCard totalThisMonth={totalThisMonth} totalLastMonth={totalLastMonth} />
      </View>

      {/* Period selector */}
      <View style={[styles.periodRow, { backgroundColor: colors.background }]}>
        {(["Day", "Week", "Month", "Year"] as const).map((p) => {
          const active = p === selectedPeriod;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodBtn,
                active
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.secondary },
              ]}
              onPress={() => setSelectedPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: active ? colors.primaryForeground : colors.secondaryForeground },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category breakdown — tappable */}
      {Object.keys(filteredCategoryTotals).length > 0 ? (
        <CategoryBar
          categoryTotals={filteredCategoryTotals}
          onCategoryPress={(cat) =>
            router.push(`/category/${encodeURIComponent(cat)}?period=${selectedPeriod}`)
          }
        />
      ) : (
        <View style={[styles.emptyPeriod, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.mutedForeground} />
          <Text style={[styles.emptyPeriodText, { color: colors.mutedForeground }]}>
            No bills{" "}
            {selectedPeriod === "Day"
              ? "today"
              : selectedPeriod === "Week"
              ? "this week"
              : selectedPeriod === "Month"
              ? "this month"
              : "this year"}
          </Text>
        </View>
      )}

      {/* Recent bills */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent bills</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/bills")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {recentBills.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.secondary }]}>
          <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No bills yet — add your first receipt
          </Text>
        </View>
      ) : (
        recentBills.map((bill) => (
          <BillCard key={bill.id} bill={bill} onPress={() => router.push(`/bill/${bill.id}`)} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { color: "#ffffff", fontSize: 11, fontFamily: "Inter_700Bold" },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  periodText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyPeriod: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyPeriodText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
