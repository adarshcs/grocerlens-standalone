import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InsightCard, type Insight } from "@/components/InsightCard";
import { QuotaBanner } from "@/components/QuotaBanner";
import { useExpenses } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const DEFAULT_INSIGHTS: Insight[] = [
  {
    id: "ins-1",
    icon: "leaf-outline",
    title: "Buy vegetables from local sabzi market",
    body: "Supermarket vegetables cost 30–50% more than your nearest sabzi mandi or wet market. A weekly trip for staples like tomato, onion, and greens can save ₹300–500/month without any change in quality.",
    tag: "Quick win",
    saving: 400,
    tagColor: "#dcfce7",
    tagTextColor: "#15803d",
    cta: "Find markets",
  },
  {
    id: "ins-2",
    icon: "cube-outline",
    title: "Stock up on dal and rice in bulk",
    body: "Pulses and rice keep for months. Buying a 5 kg or 10 kg pack from a wholesale store or D-Mart typically saves 15–20% versus smaller supermarket packs.",
    tag: "Bulk buy",
    saving: 250,
    tagColor: "#ede9fe",
    tagTextColor: "#6d28d9",
    cta: "Add to list",
  },
  {
    id: "ins-3",
    icon: "calendar-outline",
    title: "Buy seasonal fruits, skip off-season",
    body: "Off-season fruits can cost 3–4× more. Sticking to what's in season — guava and pomegranate now, mangoes in summer — cuts fruit spend significantly every month.",
    tag: "Seasonal",
    saving: 300,
    tagColor: "#fff7ed",
    tagTextColor: "#c2410c",
    cta: "See calendar",
  },
  {
    id: "ins-4",
    icon: "pricetag-outline",
    title: "Switch to store-brand oils and spices",
    body: "Private-label cooking oils, masalas, and packaged spices from Lulu or D-Mart are typically 20–30% cheaper than branded equivalents with comparable quality.",
    tag: "Store brand",
    saving: 180,
    tagColor: "#fef9c3",
    tagTextColor: "#854d0e",
    cta: "Compare",
  },
];

export default function InsightsScreen() {
  const colors = useColors();
  const currency = useCurrency();
  const insets = useSafeAreaInsets();
  const { bills, categoryTotals, totalThisMonth, familyMembers, householdId, quota } = useExpenses();
  const [insights, setInsights] = useState<Insight[]>(DEFAULT_INSIGHTS);
  const [loading, setLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const totalSaving = insights.reduce((s, ins) => s + (ins.saving ?? 0), 0);

  // Compute item-level aggregates for AI
  const topItems = useMemo(() => {
    const map: Record<
      string,
      { name: string; category: string; totalSpent: number; count: number }
    > = {};
    bills.forEach((b) => {
      b.items
        .filter((i) => i.category !== "Tax")
        .forEach((item) => {
          const key = item.name.toLowerCase().trim();
          if (!map[key]) {
            map[key] = {
              name: item.name,
              category: item.category,
              totalSpent: 0,
              count: 0,
            };
          }
          map[key].totalSpent += item.price;
          map[key].count += 1;
        });
    });
    return Object.values(map)
      .map((i) => ({ ...i, avgPrice: i.totalSpent / i.count }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 15);
  }, [bills]);

  async function loadAIInsights() {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const stores = [...new Set(bills.map((b) => b.store).filter(Boolean))];
    const recentDates = bills
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((b) => b.date);

    try {
      const response = await fetch(`${API_BASE}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalThisMonth,
          categoryTotals,
          billCount: bills.length,
          topItems,
          currencyCode: currency.currencyCode,
          locale: currency.locale,
          stores,
          memberCount: familyMembers.length,
          recentDates,
          currentDate: new Date().toISOString().split("T")[0],
          householdId: householdId ?? undefined,
        }),
      });
      if (response.status === 402) {
        const err = await response.json();
        router.push("/paywall");
        Alert.alert("Refresh limit reached", err.message ?? "Upgrade to refresh insights.");
        return;
      }
      if (!response.ok) throw new Error("Failed to load insights");
      const data = (await response.json()) as { insights?: Insight[] };
      if (data.insights?.length) {
        setInsights(data.insights);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Could not refresh", "Showing cached suggestions.");
    } finally {
      setLoading(false);
    }
  }

  // WhatsApp share summary
  async function shareViaWhatsApp() {
    const topCats = Object.entries(categoryTotals)
      .filter(([c]) => c !== "Tax")
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, v]) => `${cat}: ${currency.format(v)}`)
      .join(", ");

    const savingLine = insights[0]
      ? `\n💡 Top tip: ${insights[0].title} — save ~${currency.format(insights[0].saving ?? 0)}/mo`
      : "";

    const message =
      `🛒 *GrocerLens — ${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}*\n\n` +
      `💰 Total spent: ${currency.format(totalThisMonth)}\n` +
      `📦 ${bills.length} shopping trips\n` +
      `👥 ${familyMembers.length} member${familyMembers.length !== 1 ? "s" : ""}\n\n` +
      `Top categories: ${topCats}` +
      savingLine;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        "WhatsApp not found",
        "Please make sure WhatsApp is installed on your device."
      );
    }
  }

  const monthBars = [72, 88, 76, 95, 82, Math.min(Math.round((totalThisMonth / 300) * 100), 100)];
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString(undefined, { month: "narrow" });
  });

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
        style={[styles.header, { backgroundColor: colors.primary, paddingTop: topInset + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>AI Insights</Text>
            <Text style={styles.headerTitle}>Smart suggestions</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadAIInsights}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="refresh" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.summaryChip}>
          <Ionicons name="sparkles" size={18} color="#fbbf24" />
          <Text style={styles.summaryText}>
            Save up to{" "}
            <Text style={{ color: "#fbbf24", fontFamily: "Inter_700Bold" }}>
              {currency.format(totalSaving)}/mo
            </Text>{" "}
            with {insights.length} changes
          </Text>
        </View>
      </View>

      <QuotaBanner label="Insight refreshes" quota={quota.insightRefreshes} isPremium={quota.isPremium} />

      {/* Top items spotlight */}
      {topItems.length > 0 && (
        <View
          style={[
            styles.spotlightCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.spotlightHeader}>
            <Ionicons name="stats-chart" size={15} color={colors.primary} />
            <Text style={[styles.spotlightTitle, { color: colors.foreground }]}>
              Your top purchases
            </Text>
          </View>
          {topItems.slice(0, 4).map((item, i) => (
            <View key={item.name}>
              {i > 0 && (
                <View style={[styles.spotDivider, { backgroundColor: colors.border }]} />
              )}
              <View style={styles.spotItemRow}>
                <View
                  style={[
                    styles.spotRank,
                    { backgroundColor: i === 0 ? "#dcfce7" : colors.secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.spotRankText,
                      { color: i === 0 ? "#15803d" : colors.mutedForeground },
                    ]}
                  >
                    #{i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.spotName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.spotSub, { color: colors.mutedForeground }]}>
                    {item.category} · bought {item.count}×
                  </Text>
                </View>
                <Text style={[styles.spotTotal, { color: colors.primary }]}>
                  {currency.format(item.totalSpent)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      <View style={{ paddingTop: 4 }}>
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </View>

      {/* Tap to refresh hint */}
      <TouchableOpacity
        style={[styles.refreshHint, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={loadAIInsights}
        disabled={loading}
      >
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        <Text style={[styles.refreshHintText, { color: colors.mutedForeground }]}>
          {loading ? "Generating personalised tips…" : "Tap to regenerate with AI · based on your actual items"}
        </Text>
      </TouchableOpacity>

      {/* Monthly trend chart */}
      <View
        style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>Monthly trend</Text>
        <View style={styles.chartBars}>
          {monthBars.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${h}%` as unknown as number,
                      backgroundColor: i === 5 ? colors.primary : colors.secondary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                {monthLabels[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* WhatsApp share — now functional */}
      <TouchableOpacity
        style={styles.whatsappCard}
        activeOpacity={0.8}
        onPress={shareViaWhatsApp}
      >
        <View style={styles.whatsappIcon}>
          <Ionicons name="logo-whatsapp" size={24} color="#ffffff" />
        </View>
        <View style={styles.whatsappText}>
          <Text style={styles.whatsappTitle}>Share with household</Text>
          <Text style={styles.whatsappDesc}>
            Send this month's summary + top tip via WhatsApp
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLabel: {
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  spotlightCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  spotlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 14,
    paddingBottom: 10,
  },
  spotlightTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  spotDivider: { height: 1, marginHorizontal: 14 },
  spotItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  spotRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  spotRankText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  spotName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  spotSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  spotTotal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  refreshHint: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshHintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  },
  chartBars: {
    flexDirection: "row",
    height: 80,
    gap: 8,
    alignItems: "flex-end",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    height: "100%",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    borderRadius: 4,
    width: "100%",
  },
  barLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  whatsappCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#25d366",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  whatsappIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappText: { flex: 1, gap: 3 },
  whatsappTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  whatsappDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
