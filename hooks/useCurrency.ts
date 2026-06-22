import { useMemo } from "react";
import { createCurrencyFormatter, getDeviceLocale, type CurrencyFormatter } from "@/utils/currency";
import { useExpenses } from "@/context/ExpenseContext";

let cachedLocale: string | null = null;

function getLocaleOnce(): string {
  if (cachedLocale) return cachedLocale;
  cachedLocale = getDeviceLocale();
  return cachedLocale;
}

export function useCurrency(): CurrencyFormatter {
  const locale = getLocaleOnce();
  const { householdCurrency } = useExpenses();
  return useMemo(
    () => createCurrencyFormatter(locale, householdCurrency || undefined),
    [locale, householdCurrency]
  );
}
