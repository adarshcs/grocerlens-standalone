import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Insight {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tag: string;
  saving?: number;
  tagColor: string;
  tagTextColor: string;
  cta: string;
}

interface InsightCardProps {
  insight: Insight;
  onCta?: () => void;
}

export function InsightCard({ insight, onCta }: InsightCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
        <Ionicons name={insight.icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.tag, { backgroundColor: insight.tagColor }]}>
            <Text style={[styles.tagText, { color: insight.tagTextColor }]}>
              {insight.tag}
            </Text>
          </View>
          {insight.saving != null && (
            <Text style={[styles.saving, { color: colors.success }]}>
              Save ${insight.saving}/mo
            </Text>
          )}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{insight.title}</Text>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>{insight.body}</Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { borderColor: colors.primary }]}
          onPress={onCta}
          activeOpacity={0.7}
        >
          <Text style={[styles.ctaText, { color: colors.primary }]}>{insight.cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  saving: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  ctaBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
