import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface QuotaInfo {
  used: number;
  limit: number;
}

interface Props {
  label: string;
  quota: QuotaInfo;
  isPremium: boolean;
}

export function QuotaBanner({ label, quota, isPremium }: Props) {
  const colors = useColors();
  if (isPremium) return null;

  const remaining = quota.limit - quota.used;
  const pct = Math.min(quota.used / quota.limit, 1);
  const isExhausted = remaining <= 0;
  const isNearLimit = remaining === 1;

  const barColor = isExhausted ? "#ef4444" : isNearLimit ? "#f59e0b" : colors.primary;
  const bg = isExhausted ? "#fef2f2" : isNearLimit ? "#fffbeb" : colors.secondary;
  const textColor = isExhausted ? "#b91c1c" : isNearLimit ? "#92400e" : colors.mutedForeground;

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: isExhausted ? "#fca5a5" : isNearLimit ? "#fde68a" : colors.border }]}>
      <View style={styles.row}>
        <Ionicons
          name={isExhausted ? "lock-closed-outline" : "flash-outline"}
          size={13}
          color={barColor}
        />
        <Text style={[styles.text, { color: textColor }]}>
          {isExhausted
            ? `${label} limit reached — `
            : `${remaining} ${label.toLowerCase()} left this month · `}
          <Text
            style={[styles.upgrade, { color: barColor }]}
            onPress={() => router.push("/paywall")}
          >
            {isExhausted ? "Upgrade to continue" : "Upgrade for unlimited"}
          </Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${pct * 100}%` as unknown as number, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  upgrade: { fontFamily: "Inter_600SemiBold" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
