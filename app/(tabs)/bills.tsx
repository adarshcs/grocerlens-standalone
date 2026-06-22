import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BillCard } from "@/components/BillCard";
import { useExpenses, type CaptureMethod } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { key: CaptureMethod | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "share", label: "Shared" },
  { key: "camera", label: "Scanned" },
  { key: "manual", label: "Manual" },
];

export default function BillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bills } = useExpenses();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CaptureMethod | "all">("all");

  const filtered = bills.filter((b) => {
    const matchesFilter = filter === "all" || b.captureMethod === filter;
    const matchesSearch = b.store.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.primary,
            paddingTop: topInset + 16,
          },
        ]}
      >
        <Text style={styles.headerTitle}>Bills</Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/capture")}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.primary, paddingBottom: 16 }]}>
        <View style={[styles.searchBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bills…"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        contentContainerStyle={styles.filterList}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === item.key ? colors.primary : colors.secondary,
              },
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    filter === item.key
                      ? colors.primaryForeground
                      : colors.secondaryForeground,
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Bills list */}
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.secondary }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No bills match your search" : "No bills yet"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BillCard
            bill={item}
            onPress={() => router.push(`/bill/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    margin: 16,
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
