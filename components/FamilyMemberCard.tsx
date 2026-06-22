import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useCurrency } from "@/hooks/useCurrency";
import type { FamilyMember } from "@/context/ExpenseContext";

interface FamilyMemberCardProps {
  member: FamilyMember;
  totalShare: number;
  billCount: number;
  onRemove?: () => void;
}

export function FamilyMemberCard({
  member,
  totalShare,
  billCount,
  onRemove,
}: FamilyMemberCardProps) {
  const colors = useColors();
  const currency = useCurrency();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: member.color + "22" }]}>
        <Text style={[styles.initials, { color: member.color }]}>{member.initials}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{member.name}</Text>
          {member.isOwner && (
            <View style={[styles.ownerBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.ownerText, { color: colors.primary }]}>Owner</Text>
            </View>
          )}
        </View>
        {member.email && (
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {member.email}
          </Text>
        )}
        <Text style={[styles.stats, { color: colors.mutedForeground }]}>
          {currency.format(totalShare)} · {billCount} bill{billCount !== 1 ? "s" : ""}
        </Text>
      </View>
      {!member.isOwner && onRemove && (
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="remove-circle-outline" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  ownerText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  email: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  stats: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
