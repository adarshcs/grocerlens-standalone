import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

const FEATURES_TABLE = [
  { label: "AI receipt scans", free: "4/mo", premium: "Unlimited" },
  { label: "AI insights refresh", free: "4/mo", premium: "Unlimited" },
  { label: "Household sharing", free: "✓", premium: "✓" },
  { label: "Category breakdown", free: "✓", premium: "✓" },
  { label: "CSV export", free: "—", premium: "✓" },
  { label: "Priority processing", free: "—", premium: "✓" },
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring, isSubscribed } =
    useSubscription();

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const currentOffering = offerings?.current;
  const availablePackages = currentOffering?.availablePackages ?? [];

  const monthlyPkg = availablePackages.find((p) => p.packageType === "MONTHLY");
  const annualPkg = availablePackages.find((p) => p.packageType === "ANNUAL");
  const orderedPackages = [
    ...(annualPkg ? [annualPkg] : []),
    ...(monthlyPkg ? [monthlyPkg] : []),
    ...availablePackages.filter(
      (p) => p.packageType !== "MONTHLY" && p.packageType !== "ANNUAL"
    ),
  ];

  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(
    annualPkg?.identifier ?? monthlyPkg?.identifier ?? null
  );
  const [confirmPkg, setConfirmPkg] = useState<PurchasesPackage | null>(null);

  const selectedPkg =
    availablePackages.find((p) => p.identifier === selectedPkgId) ?? orderedPackages[0] ?? null;

  function isAnnual(pkg: PurchasesPackage) {
    return pkg.packageType === "ANNUAL";
  }

  async function handleConfirmedPurchase(pkg: PurchasesPackage) {
    setConfirmPkg(null);
    try {
      await purchase(pkg);
      router.back();
    } catch (err: any) {
      if (err?.userCancelled) return;
    }
  }

  async function handleRestore() {
    try {
      await restore();
      if (isSubscribed) router.back();
    } catch {
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#15803d", paddingTop: topInset + 16 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={32} color="#fbbf24" />
        </View>
        <Text style={styles.headerTitle}>GrocerLens Premium</Text>
        <Text style={styles.headerSub}>
          Unlimited AI receipt scanning and personalised spending insights
        </Text>
      </View>

      {/* Limit hit callout */}
      <View style={[styles.callout, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
        <Ionicons name="lock-closed-outline" size={16} color="#dc2626" />
        <Text style={styles.calloutText}>
          You've reached your free monthly limit. Upgrade to continue using AI features.
        </Text>
      </View>

      {/* Plan selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a plan</Text>

        {isLoading ? (
          <ActivityIndicator color="#15803d" style={{ marginVertical: 24 }} />
        ) : orderedPackages.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No plans available right now.
          </Text>
        ) : (
          orderedPackages.map((pkg) => {
            const isSelected = (selectedPkgId ?? orderedPackages[0]?.identifier) === pkg.identifier;
            const annual = isAnnual(pkg);
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isSelected ? "#dcfce7" : colors.card,
                    borderColor: isSelected ? "#15803d" : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedPkgId(pkg.identifier)}
                activeOpacity={0.85}
              >
                {annual && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>Best value · Save 33%</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View
                    style={[
                      styles.planRadio,
                      { borderColor: isSelected ? "#15803d" : colors.border },
                    ]}
                  >
                    {isSelected && <View style={styles.planRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planLabel, { color: colors.foreground }]}>
                      {pkg.product.title || (annual ? "Annual" : "Monthly")}
                    </Text>
                    {annual && (
                      <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                        {pkg.product.priceString}/year
                      </Text>
                    )}
                  </View>
                  <View style={styles.planPriceWrap}>
                    <Text style={[styles.planPrice, { color: "#15803d" }]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>
                      /{annual ? "year" : "month"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, { opacity: isPurchasing || isLoading ? 0.7 : 1 }]}
        onPress={() => selectedPkg && setConfirmPkg(selectedPkg)}
        disabled={isPurchasing || isLoading || !selectedPkg}
        activeOpacity={0.85}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color="#ffffff" />
            <Text style={styles.ctaText}>
              {selectedPkg
                ? `Get Premium · ${selectedPkg.product.priceString}/${isAnnual(selectedPkg) ? "yr" : "mo"}`
                : "Get Premium"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={handleRestore}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <ActivityIndicator color="#15803d" />
        ) : (
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
            Restore purchase
          </Text>
        )}
      </TouchableOpacity>

      {/* Feature comparison */}
      <View style={styles.section}>
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.featureHeader}>
            <Text style={[styles.featureCol, { color: colors.mutedForeground }]}>Feature</Text>
            <Text style={[styles.featureColRight, { color: colors.mutedForeground }]}>Free</Text>
            <Text style={[styles.featureColRight, { color: "#15803d" }]}>Premium</Text>
          </View>
          {FEATURES_TABLE.map((row, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                i % 2 === 1 && { backgroundColor: colors.secondary },
              ]}
            >
              <Text style={[styles.featureCol, { color: colors.foreground }]}>{row.label}</Text>
              <Text style={[styles.featureColRight, { color: colors.mutedForeground }]}>
                {row.free}
              </Text>
              <Text
                style={[
                  styles.featureColRight,
                  {
                    color: row.premium === "—" ? colors.mutedForeground : "#15803d",
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {row.premium}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.fine, { color: colors.mutedForeground }]}>
        Subscriptions auto-renew. Cancel anytime in App Store / Play Store settings.
      </Text>

      {/* Test-mode purchase confirmation modal */}
      <Modal
        visible={!!confirmPkg}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPkg(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Ionicons name="sparkles" size={28} color="#fbbf24" style={{ marginBottom: 8 }} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Confirm Purchase
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {confirmPkg
                ? `Subscribe to ${confirmPkg.product.title} for ${confirmPkg.product.priceString}/${isAnnual(confirmPkg) ? "year" : "month"}?`
                : ""}
            </Text>
            <Text style={[styles.modalNote, { color: colors.mutedForeground }]}>
              (Test store purchase — no real charge)
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
                onPress={() => setConfirmPkg(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#15803d" }]}
                onPress={() => confirmPkg && handleConfirmedPurchase(confirmPkg)}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
    gap: 10,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  callout: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  calloutText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#dc2626",
    flex: 1,
    lineHeight: 18,
  },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginVertical: 16,
  },
  planCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#15803d",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  planBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#15803d",
  },
  planLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  planPriceWrap: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ctaBtn: {
    marginHorizontal: 16,
    backgroundColor: "#15803d",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  restoreBtn: { alignItems: "center", marginBottom: 24 },
  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  featureHeader: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  featureRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  featureCol: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  featureColRight: {
    width: 72,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  fine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  modalNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
