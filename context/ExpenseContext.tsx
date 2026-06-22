import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export type CaptureMethod = "sms" | "share" | "email" | "camera" | "manual";

export interface BillItem {
  id: string;
  name: string;
  qty: string;
  price: number;
  category: string;
}

export interface Bill {
  id: string;
  store: string;
  date: string;
  total: number;
  items: BillItem[];
  captureMethod: CaptureMethod;
  receiptUrl?: string;
  imageUri?: string;
  addedAt: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  email?: string;
  phone?: string;
  color: string;
  isOwner?: boolean;
}

export interface QuotaStatus {
  billScans: { used: number; limit: number };
  insightRefreshes: { used: number; limit: number };
  isPremium: boolean;
}

const DEFAULT_QUOTA: QuotaStatus = {
  billScans: { used: 0, limit: 4 },
  insightRefreshes: { used: 0, limit: 4 },
  isPremium: false,
};

interface ExpenseContextType {
  bills: Bill[];
  familyMembers: FamilyMember[];
  smsMonitoringEnabled: boolean;
  emailAddress: string;
  isLoading: boolean;
  deviceId: string;
  householdId: string | null;
  inviteCode: string | null;
  isHouseholdOwner: boolean;
  householdCurrency: string;
  quota: QuotaStatus;
  addBill: (bill: Omit<Bill, "id" | "addedAt">) => Promise<void>;
  removeBill: (id: string) => Promise<void>;
  addFamilyMember: (member: Omit<FamilyMember, "id">) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  setSmsMonitoringEnabled: (enabled: boolean) => Promise<void>;
  joinHousehold: (code: string, name: string) => Promise<{ success: boolean; error?: string }>;
  totalThisMonth: number;
  totalLastMonth: number;
  categoryTotals: Record<string, number>;
  billsByMethod: Record<CaptureMethod, number>;
}

const MEMBER_COLORS = [
  "#15803d",
  "#22c55e",
  "#4ade80",
  "#0284c7",
  "#9333ea",
  "#f59e0b",
];

const SAMPLE_BILLS: Bill[] = [
  {
    id: "sample-1",
    store: "Whole Foods",
    date: "2026-06-22",
    total: 84.3,
    captureMethod: "sms",
    addedAt: Date.now() - 1000 * 60 * 60 * 2,
    items: [
      { id: "i1", name: "Organic Chicken Breast", qty: "2 lbs", price: 14.98, category: "Meat" },
      { id: "i2", name: "Baby Spinach", qty: "5 oz", price: 3.49, category: "Produce" },
      { id: "i3", name: "Almond Milk", qty: "1 gal", price: 4.99, category: "Dairy" },
      { id: "i4", name: "Greek Yogurt 4pk", qty: "1 pack", price: 6.99, category: "Dairy" },
      { id: "i5", name: "Blueberries", qty: "1 pint", price: 4.99, category: "Produce" },
      { id: "i6", name: "Brown Rice", qty: "2 lbs", price: 3.79, category: "Grains" },
      { id: "i7", name: "Protein Bars 6pk", qty: "1 box", price: 12.99, category: "Snacks" },
      { id: "i8", name: "Olive Oil", qty: "500ml", price: 8.49, category: "Pantry" },
      { id: "i9", name: "Sourdough Bread", qty: "1 loaf", price: 4.99, category: "Bakery" },
      { id: "i10", name: "Free Range Eggs", qty: "12pk", price: 5.99, category: "Dairy" },
      { id: "i11", name: "Lemons", qty: "3 pack", price: 2.49, category: "Produce" },
      { id: "i12", name: "Garlic", qty: "1 head", price: 0.99, category: "Produce" },
      { id: "i13", name: "Cherry Tomatoes", qty: "1 pint", price: 3.49, category: "Produce" },
      { id: "i14", name: "Tax", qty: "", price: 4.65, category: "Tax" },
    ],
  },
  {
    id: "sample-2",
    store: "Trader Joe's",
    date: "2026-06-21",
    total: 47.6,
    captureMethod: "email",
    addedAt: Date.now() - 1000 * 60 * 60 * 26,
    items: [
      { id: "j1", name: "Cauliflower Gnocchi", qty: "2 bags", price: 7.98, category: "Frozen" },
      { id: "j2", name: "Mandarin Oranges", qty: "3 lbs", price: 3.99, category: "Produce" },
      { id: "j3", name: "Brie Cheese", qty: "8 oz", price: 5.49, category: "Dairy" },
      { id: "j4", name: "Cold Brew Coffee", qty: "32oz", price: 4.99, category: "Drinks" },
      { id: "j5", name: "Dark Chocolate", qty: "3.5oz", price: 1.99, category: "Snacks" },
      { id: "j6", name: "Quinoa", qty: "1 lb", price: 3.99, category: "Grains" },
      { id: "j7", name: "Avocados 6pk", qty: "1 bag", price: 5.99, category: "Produce" },
      { id: "j8", name: "Coconut Water 6pk", qty: "1 pack", price: 6.99, category: "Drinks" },
      { id: "j9", name: "Tax", qty: "", price: 2.19, category: "Tax" },
    ],
  },
  {
    id: "sample-3",
    store: "Costco",
    date: "2026-06-20",
    total: 132.45,
    captureMethod: "camera",
    addedAt: Date.now() - 1000 * 60 * 60 * 50,
    items: [
      { id: "k1", name: "Chicken Thighs", qty: "10 lbs", price: 24.99, category: "Meat" },
      { id: "k2", name: "Salmon Fillets", qty: "3 lbs", price: 29.99, category: "Seafood" },
      { id: "k3", name: "Mixed Greens", qty: "1.5 lbs", price: 7.99, category: "Produce" },
      { id: "k4", name: "Greek Yogurt 24pk", qty: "1 case", price: 18.99, category: "Dairy" },
      { id: "k5", name: "Almond Butter", qty: "2 jars", price: 14.99, category: "Pantry" },
      { id: "k6", name: "Sparkling Water 48pk", qty: "1 case", price: 19.99, category: "Drinks" },
      { id: "k7", name: "Tax", qty: "", price: 15.51, category: "Tax" },
    ],
  },
  {
    id: "sample-4",
    store: "Aldi",
    date: "2026-06-18",
    total: 38.9,
    captureMethod: "sms",
    addedAt: Date.now() - 1000 * 60 * 60 * 76,
    items: [
      { id: "l1", name: "Pasta", qty: "2 lbs", price: 2.98, category: "Pantry" },
      { id: "l2", name: "Canned Tomatoes 4pk", qty: "4 cans", price: 3.96, category: "Pantry" },
      { id: "l3", name: "Whole Milk", qty: "1 gal", price: 3.49, category: "Dairy" },
      { id: "l4", name: "Bananas", qty: "1 bunch", price: 1.19, category: "Produce" },
      { id: "l5", name: "Apples Gala 3lb", qty: "1 bag", price: 2.89, category: "Produce" },
      { id: "l6", name: "Sliced Turkey", qty: "9 oz", price: 2.99, category: "Deli" },
      { id: "l7", name: "Sharp Cheddar", qty: "16 oz", price: 4.29, category: "Dairy" },
      { id: "l8", name: "Bread Wheat", qty: "1 loaf", price: 2.29, category: "Bakery" },
      { id: "l9", name: "Frozen Peas", qty: "2 lbs", price: 2.29, category: "Frozen" },
      { id: "l10", name: "Orange Juice", qty: "52oz", price: 3.49, category: "Drinks" },
      { id: "l11", name: "Butter", qty: "1 lb", price: 3.79, category: "Dairy" },
      { id: "l12", name: "Tax", qty: "", price: 3.25, category: "Tax" },
    ],
  },
  {
    id: "sample-5",
    store: "Walmart",
    date: "2026-06-15",
    total: 56.2,
    captureMethod: "share",
    addedAt: Date.now() - 1000 * 60 * 60 * 120,
    items: [
      { id: "m1", name: "Chicken Wings", qty: "4 lbs", price: 12.96, category: "Meat" },
      { id: "m2", name: "Rice Jasmine 5lb", qty: "1 bag", price: 5.97, category: "Grains" },
      { id: "m3", name: "Frozen Broccoli 4pk", qty: "4 bags", price: 5.96, category: "Frozen" },
      { id: "m4", name: "Black Beans 4pk", qty: "4 cans", price: 4.96, category: "Pantry" },
      { id: "m5", name: "Soy Sauce", qty: "10oz", price: 2.98, category: "Pantry" },
      { id: "m6", name: "Sriracha", qty: "17oz", price: 3.98, category: "Pantry" },
      { id: "m7", name: "Tortillas 30pk", qty: "1 pack", price: 4.97, category: "Bakery" },
      { id: "m8", name: "Shredded Cheese", qty: "16 oz", price: 4.98, category: "Dairy" },
      { id: "m9", name: "Tax", qty: "", price: 4.44, category: "Tax" },
    ],
  },
];

const SAMPLE_MEMBERS: FamilyMember[] = [
  { id: "me", name: "You", initials: "ME", color: "#15803d", isOwner: true },
  { id: "m2", name: "Jamie", initials: "JT", color: "#22c55e" },
];

const STORAGE_KEYS = {
  BILLS: "@grocerlens/bills",
  MEMBERS: "@grocerlens/members",
  SMS_ENABLED: "@grocerlens/sms_enabled",
  EMAIL_ADDRESS: "@grocerlens/email_address",
  SEEDED: "@grocerlens/seeded",
  DEVICE_ID: "@grocerlens/device_id",
  HOUSEHOLD_ID: "@grocerlens/household_id",
  INVITE_CODE: "@grocerlens/invite_code",
  IS_OWNER: "@grocerlens/is_owner",
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateEmailAddress(): string {
  const suffix = Math.random().toString(36).substr(2, 8);
  return `gl-${suffix}@bills.grocerlens.app`;
}

function generateDeviceId(): string {
  return "dev_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function serverBillsToLocal(serverBills: Record<string, unknown>[]): Bill[] {
  return serverBills.map((b) => ({
    id: b.id as string,
    store: b.store as string,
    date: b.date as string,
    total: b.total as number,
    captureMethod: (b.captureMethod as CaptureMethod) ?? "manual",
    addedAt: b.addedAt ? new Date(b.addedAt as string).getTime() : Date.now(),
    items: ((b.items as Record<string, unknown>[]) ?? []).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      qty: (item.qty as string) ?? "",
      price: item.price as number,
      category: (item.category as string) ?? "Pantry",
    })),
  }));
}

function serverMembersToLocal(
  serverMembers: Record<string, unknown>[],
  myDeviceId: string
): FamilyMember[] {
  return serverMembers.map((m) => ({
    id: m.id as string,
    name: m.deviceId === myDeviceId ? "You" : (m.name as string),
    initials: m.initials as string,
    color: (m.color as string) ?? "#15803d",
    isOwner: m.isOwner as boolean,
    email: m.email as string | undefined,
    phone: m.phone as string | undefined,
  }));
}

const ExpenseContext = createContext<ExpenseContextType | null>(null);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [smsMonitoringEnabled, setSmsMonitoringState] = useState(
    Platform.OS === "android"
  );
  const [emailAddress, setEmailAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isHouseholdOwner, setIsHouseholdOwner] = useState(true);
  const [householdCurrency, setHouseholdCurrency] = useState<string>("INR");
  const [quota, setQuota] = useState<QuotaStatus>(DEFAULT_QUOTA);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [
          smsRaw,
          emailRaw,
          seededRaw,
          storedDeviceId,
          storedHouseholdId,
          storedInviteCode,
          storedIsOwner,
          billsRaw,
          membersRaw,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SMS_ENABLED),
          AsyncStorage.getItem(STORAGE_KEYS.EMAIL_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEYS.SEEDED),
          AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID),
          AsyncStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID),
          AsyncStorage.getItem(STORAGE_KEYS.INVITE_CODE),
          AsyncStorage.getItem(STORAGE_KEYS.IS_OWNER),
          AsyncStorage.getItem(STORAGE_KEYS.BILLS),
          AsyncStorage.getItem(STORAGE_KEYS.MEMBERS),
        ]);

        if (smsRaw !== null) setSmsMonitoringState(smsRaw === "true");

        if (emailRaw) setEmailAddress(emailRaw);

        let devId = storedDeviceId;
        if (!devId) {
          devId = generateDeviceId();
          await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
        }
        setDeviceId(devId);

        const isSeeded = seededRaw === "true";

        if (storedHouseholdId && storedInviteCode) {
          setHouseholdId(storedHouseholdId);
          setInviteCode(storedInviteCode);
          setIsHouseholdOwner(storedIsOwner !== "false");

          const cachedBills: Bill[] = billsRaw ? JSON.parse(billsRaw) : [];
          const cachedMembers: FamilyMember[] = membersRaw ? JSON.parse(membersRaw) : [];
          setBills(cachedBills);
          setFamilyMembers(cachedMembers);

          // Sync from server in background
          syncFromServerInternal(storedHouseholdId, devId).catch(() => {});
        } else {
          // No household yet — create one on server
          const ownerName = "You";
          try {
            const res = await fetch(`${API_BASE}/api/households`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deviceId: devId, ownerName }),
            });
            if (res.ok) {
              const data = (await res.json()) as {
                householdId: string;
                inviteCode: string;
                receiptEmail?: string;
                bills: Record<string, unknown>[];
                members: Record<string, unknown>[];
              };
              setHouseholdId(data.householdId);
              setInviteCode(data.inviteCode);
              setIsHouseholdOwner(true);
              if (data.receiptEmail) {
                setEmailAddress(data.receiptEmail);
              }

              await AsyncStorage.multiSet([
                [STORAGE_KEYS.HOUSEHOLD_ID, data.householdId],
                [STORAGE_KEYS.INVITE_CODE, data.inviteCode],
                [STORAGE_KEYS.IS_OWNER, "true"],
                ...(data.receiptEmail ? [[STORAGE_KEYS.EMAIL_ADDRESS, data.receiptEmail] as [string, string]] : []),
              ]);

              // If first launch, seed sample bills with device-scoped IDs to avoid conflicts
              if (!isSeeded) {
                const prefix = devId.slice(-8);
                const seedBills = SAMPLE_BILLS.map((bill, bi) => ({
                  ...bill,
                  id: `${prefix}-s${bi + 1}`,
                  items: bill.items.map((item, ii) => ({
                    ...item,
                    id: `${prefix}-s${bi + 1}-i${ii + 1}`,
                  })),
                }));
                const seedMembers = SAMPLE_MEMBERS;

                for (const bill of seedBills) {
                  fetch(`${API_BASE}/api/households/${data.householdId}/bills`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bill, deviceId: devId }),
                  }).catch(() => {});
                }

                await AsyncStorage.multiSet([
                  [STORAGE_KEYS.BILLS, JSON.stringify(seedBills)],
                  [STORAGE_KEYS.MEMBERS, JSON.stringify(seedMembers)],
                  [STORAGE_KEYS.SEEDED, "true"],
                ]);
                setBills(seedBills);
                setFamilyMembers(seedMembers);
              } else {
                const cachedBills: Bill[] = billsRaw ? JSON.parse(billsRaw) : [];
                const cachedMembers: FamilyMember[] = membersRaw ? JSON.parse(membersRaw) : [];
                setBills(cachedBills.length ? cachedBills : SAMPLE_BILLS);
                setFamilyMembers(cachedMembers.length ? cachedMembers : SAMPLE_MEMBERS);
              }
            } else {
              // Server unavailable — use local cache
              fallbackToLocal(billsRaw, membersRaw, isSeeded);
            }
          } catch {
            fallbackToLocal(billsRaw, membersRaw, isSeeded);
          }
        }
      } catch {
        setBills(SAMPLE_BILLS);
        setFamilyMembers(SAMPLE_MEMBERS);
      } finally {
        setIsLoading(false);
      }
    }

    function fallbackToLocal(
      billsRaw: string | null,
      membersRaw: string | null,
      isSeeded: boolean
    ) {
      if (!isSeeded) {
        setBills(SAMPLE_BILLS);
        setFamilyMembers(SAMPLE_MEMBERS);
        AsyncStorage.multiSet([
          [STORAGE_KEYS.BILLS, JSON.stringify(SAMPLE_BILLS)],
          [STORAGE_KEYS.MEMBERS, JSON.stringify(SAMPLE_MEMBERS)],
          [STORAGE_KEYS.SEEDED, "true"],
        ]);
      } else {
        setBills(billsRaw ? JSON.parse(billsRaw) : SAMPLE_BILLS);
        setFamilyMembers(membersRaw ? JSON.parse(membersRaw) : SAMPLE_MEMBERS);
      }
    }

    init();
  }, []);

  async function syncFromServerInternal(hid: string, devId: string) {
    const res = await fetch(`${API_BASE}/api/households/${hid}/sync`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      bills: Record<string, unknown>[];
      members: Record<string, unknown>[];
      receiptEmail?: string;
      currencyCode?: string;
      quota?: QuotaStatus;
    };
    const newBills = serverBillsToLocal(data.bills);
    const newMembers = serverMembersToLocal(data.members, devId);
    setBills(newBills);
    setFamilyMembers(newMembers);
    if (data.receiptEmail) setEmailAddress(data.receiptEmail);
    if (data.currencyCode) setHouseholdCurrency(data.currencyCode);
    if (data.quota) setQuota(data.quota);
    AsyncStorage.multiSet([
      [STORAGE_KEYS.BILLS, JSON.stringify(newBills)],
      [STORAGE_KEYS.MEMBERS, JSON.stringify(newMembers)],
      ...(data.receiptEmail ? [[STORAGE_KEYS.EMAIL_ADDRESS, data.receiptEmail] as [string, string]] : []),
    ]).catch(() => {});
  }

  // Poll for updates from other household members
  useEffect(() => {
    if (!householdId || !deviceId) return;
    pollRef.current = setInterval(() => {
      syncFromServerInternal(householdId, deviceId).catch(() => {});
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [householdId, deviceId]);

  const addBill = useCallback(
    async (bill: Omit<Bill, "id" | "addedAt">) => {
      const newBill: Bill = { ...bill, id: generateId(), addedAt: Date.now() };
      setBills((prev) => {
        const updated = [newBill, ...prev];
        AsyncStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
        return updated;
      });

      // Sync to server
      if (householdId && deviceId) {
        fetch(`${API_BASE}/api/households/${householdId}/bills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bill: newBill, deviceId }),
        }).catch(() => {});
      }
    },
    [householdId, deviceId]
  );

  const removeBill = useCallback(
    async (id: string) => {
      setBills((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        AsyncStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
        return updated;
      });

      if (householdId) {
        fetch(`${API_BASE}/api/households/${householdId}/bills/${id}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    },
    [householdId]
  );

  const addFamilyMember = useCallback(async (member: Omit<FamilyMember, "id">) => {
    const newMember: FamilyMember = {
      ...member,
      id: generateId(),
      color: MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
    };
    setFamilyMembers((prev) => {
      const updated = [...prev, newMember];
      AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFamilyMember = useCallback(async (id: string) => {
    setFamilyMembers((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setSmsMonitoringEnabled = useCallback(async (enabled: boolean) => {
    setSmsMonitoringState(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.SMS_ENABLED, String(enabled));
  }, []);

  const joinHousehold = useCallback(
    async (code: string, name: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const infoRes = await fetch(
          `${API_BASE}/api/households/code/${code.toUpperCase()}`
        );
        if (!infoRes.ok) {
          return { success: false, error: "Invalid invite code. Please check and try again." };
        }
        const info = (await infoRes.json()) as { householdId: string };

        const joinRes = await fetch(
          `${API_BASE}/api/households/${info.householdId}/join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId, name }),
          }
        );
        if (!joinRes.ok) {
          return { success: false, error: "Failed to join. Please try again." };
        }
        const data = (await joinRes.json()) as {
          success: boolean;
          householdId: string;
          inviteCode: string;
          isOwner: boolean;
          bills: Record<string, unknown>[];
          members: Record<string, unknown>[];
        };

        setHouseholdId(data.householdId);
        setInviteCode(data.inviteCode);
        setIsHouseholdOwner(data.isOwner);

        const newBills = serverBillsToLocal(data.bills);
        const newMembers = serverMembersToLocal(data.members, deviceId);
        setBills(newBills);
        setFamilyMembers(newMembers);

        await AsyncStorage.multiSet([
          [STORAGE_KEYS.HOUSEHOLD_ID, data.householdId],
          [STORAGE_KEYS.INVITE_CODE, data.inviteCode],
          [STORAGE_KEYS.IS_OWNER, String(data.isOwner)],
          [STORAGE_KEYS.BILLS, JSON.stringify(newBills)],
          [STORAGE_KEYS.MEMBERS, JSON.stringify(newMembers)],
        ]);

        return { success: true };
      } catch {
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [deviceId]
  );

  const now = new Date();
  const thisMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthYear = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  const totalThisMonth = useMemo(
    () =>
      bills
        .filter((b) => b.date.startsWith(thisMonthYear))
        .reduce((sum, b) => sum + b.total, 0),
    [bills, thisMonthYear]
  );

  const totalLastMonth = useMemo(
    () =>
      bills
        .filter((b) => b.date.startsWith(lastMonthYear))
        .reduce((sum, b) => sum + b.total, 0),
    [bills, lastMonthYear]
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    bills
      .filter((b) => b.date.startsWith(thisMonthYear))
      .forEach((b) => {
        b.items
          .filter((i) => i.category !== "Tax")
          .forEach((item) => {
            totals[item.category] = (totals[item.category] ?? 0) + item.price;
          });
      });
    return totals;
  }, [bills, thisMonthYear]);

  const billsByMethod = useMemo(() => {
    const counts: Record<CaptureMethod, number> = {
      sms: 0,
      share: 0,
      email: 0,
      camera: 0,
      manual: 0,
    };
    bills.forEach((b) => {
      counts[b.captureMethod] = (counts[b.captureMethod] ?? 0) + 1;
    });
    return counts;
  }, [bills]);

  return (
    <ExpenseContext.Provider
      value={{
        bills,
        familyMembers,
        smsMonitoringEnabled,
        emailAddress,
        isLoading,
        deviceId,
        householdId,
        inviteCode,
        isHouseholdOwner,
        householdCurrency,
        quota,
        addBill,
        removeBill,
        addFamilyMember,
        removeFamilyMember,
        setSmsMonitoringEnabled,
        joinHousehold,
        totalThisMonth,
        totalLastMonth,
        categoryTotals,
        billsByMethod,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used inside ExpenseProvider");
  return ctx;
}
