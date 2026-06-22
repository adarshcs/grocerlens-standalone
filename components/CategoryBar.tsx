import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";

export const CATEGORY_COLORS: Record<string, string> = {
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
  Tax: "#9ca3af",
  Other: "#6b7280",
};

export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other;
}

interface CategoryBarProps {
  categoryTotals: Record<string, number>;
  onCategoryPress?: (category: string) => void;
}

export function CategoryBar({ categoryTotals, onCategoryPress }: CategoryBarProps) {
  const colors = useColors();
  const currency = useCurrency();

  const sorted = useMemo(
    () =>
      Object.entries(categoryTotals)
        .filter(([cat]) => cat !== "Tax")
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6),
    [categoryTotals]
  );

  const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);

  if (sorted.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>By category</Text>

      {/* Stacked bar — tappable segments */}
      <View style={styles.stackedBar}>
        {sorted.map(([cat, val]) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.segment,
              { flex: val / grandTotal, backgroundColor: getCategoryColor(cat) },
            ]}
            onPress={() => onCategoryPress?.(cat)}
            activeOpacity={onCategoryPress ? 0.7 : 1}
          />
        ))}
      </View>

      {/* Legend rows */}
      <View style={styles.legend}>
        {sorted.map(([cat, val]) => {
          const color = getCategoryColor(cat);
          const pct = Math.round((val / grandTotal) * 100);
          return (
            <TouchableOpacity
              key={cat}
              style={styles.legendItem}
              onPress={() => onCategoryPress?.(cat)}
              activeOpacity={onCategoryPress ? 0.65 : 1}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.catName, { color: colors.foreground }]}>
                  {cat}
                </Text>
                <Text style={[styles.catAmount, { color: colors.mutedForeground }]}>
                  {currency.format(val)}
                </Text>
              </View>
              <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                {pct}%
              </Text>
              {onCategoryPress && (
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={colors.mutedForeground}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  stackedBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
    gap: 2,
  },
  segment: {
    borderRadius: 2,
  },
  legend: {
    marginTop: 12,
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catAmount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  catPct: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
