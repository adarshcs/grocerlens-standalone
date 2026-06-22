import { NativeModules, Platform } from "react-native";

const REGION_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD",
  IN: "INR", SG: "SGD", HK: "HKD", MY: "MYR", PH: "PHP",
  TH: "THB", ID: "IDR", VN: "VND", PK: "PKR", BD: "BDT",
  JP: "JPY", CN: "CNY", TW: "TWD", KR: "KRW",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  AT: "EUR", BE: "EUR", PT: "EUR", FI: "EUR", IE: "EUR",
  GR: "EUR", SK: "EUR", SI: "EUR", CY: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP",
  PE: "PEN", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS",
  CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN",
  CZ: "CZK", HU: "HUF", RO: "RON", RU: "RUB", UA: "UAH",
  TR: "TRY", IL: "ILS", AE: "AED", SA: "SAR", QA: "QAR",
  EG: "EGP", MA: "MAD",
};

const LANGUAGE_DEFAULT_CURRENCY: Record<string, string> = {
  ja: "JPY", ko: "KRW", zh: "CNY", ru: "RUB", tr: "TRY",
  ar: "SAR", he: "ILS", th: "THB", vi: "VND", id: "IDR",
  ms: "MYR", hi: "INR", bn: "BDT",
};

export function getDeviceLocale(): string {
  if (Platform.OS === "web") {
    return (typeof navigator !== "undefined" && navigator.language) || "en-US";
  }
  if (Platform.OS === "ios") {
    const settings = NativeModules.SettingsManager?.settings;
    const locale =
      settings?.AppleLocale ||
      settings?.AppleLanguages?.[0] ||
      "en-US";
    return String(locale).replace(/_/g, "-");
  }
  const locale =
    NativeModules.I18nManager?.localeIdentifier ||
    "en-US";
  return String(locale).replace(/_/g, "-");
}

export function getCurrencyCode(locale: string): string {
  const parts = locale.replace(/_/g, "-").split("-");
  const language = parts[0]?.toLowerCase() ?? "en";
  const region = parts[1]?.toUpperCase() ?? "";

  if (region && REGION_TO_CURRENCY[region]) {
    return REGION_TO_CURRENCY[region];
  }
  if (LANGUAGE_DEFAULT_CURRENCY[language]) {
    return LANGUAGE_DEFAULT_CURRENCY[language];
  }
  const europeanLanguages = ["de", "fr", "it", "es", "nl", "pt", "fi", "el", "sk", "sl", "et", "lv", "lt"];
  if (europeanLanguages.includes(language)) {
    return "EUR";
  }
  return "USD";
}

export interface CurrencyParts {
  symbol: string;
  symbolPosition: "prefix" | "suffix";
  whole: string;
  fraction: string;
  decimalSep: string;
  hasDecimals: boolean;
}

export interface CurrencyFormatter {
  locale: string;
  currencyCode: string;
  format: (amount: number) => string;
  formatParts: (amount: number) => CurrencyParts;
  formatCompact: (amount: number) => string;
  symbol: string;
  symbolPosition: "prefix" | "suffix";
}

export function createCurrencyFormatter(locale: string, currencyCodeOverride?: string): CurrencyFormatter {
  const currencyCode = currencyCodeOverride || getCurrencyCode(locale);

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const noDecimalCurrencies = ["JPY", "KRW", "VND", "IDR", "CLP"];
  const hasDecimals = !noDecimalCurrencies.includes(currencyCode);

  const compactFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  function detectSymbolAndPosition(): { symbol: string; symbolPosition: "prefix" | "suffix" } {
    try {
      const parts = formatter.formatToParts(0);
      const symbolPart = parts.find((p) => p.type === "currency");
      const symbol = symbolPart?.value ?? currencyCode;
      const symbolIndex = parts.findIndex((p) => p.type === "currency");
      const integerIndex = parts.findIndex((p) => p.type === "integer");
      const symbolPosition = symbolIndex < integerIndex ? "prefix" : "suffix";
      return { symbol, symbolPosition };
    } catch {
      return { symbol: currencyCode, symbolPosition: "prefix" };
    }
  }

  const { symbol, symbolPosition } = detectSymbolAndPosition();

  function format(amount: number): string {
    try {
      return formatter.format(amount);
    } catch {
      return `${symbol}${amount.toFixed(hasDecimals ? 2 : 0)}`;
    }
  }

  function formatParts(amount: number): CurrencyParts {
    try {
      const parts = formatter.formatToParts(amount);
      const whole = parts
        .filter((p) => p.type === "integer" || p.type === "group")
        .map((p) => p.value)
        .join("");
      const decimalSep = parts.find((p) => p.type === "decimal")?.value ?? ".";
      const fraction = parts.find((p) => p.type === "fraction")?.value ?? "00";
      return { symbol, symbolPosition, whole, fraction, decimalSep, hasDecimals };
    } catch {
      const whole = Math.floor(Math.abs(amount)).toLocaleString();
      const fraction = String(Math.round((Math.abs(amount) % 1) * 100)).padStart(2, "0");
      return { symbol, symbolPosition, whole, fraction, decimalSep: ".", hasDecimals };
    }
  }

  function formatCompact(amount: number): string {
    try {
      return compactFormatter.format(amount);
    } catch {
      return format(amount);
    }
  }

  return { locale, currencyCode, format, formatParts, formatCompact, symbol, symbolPosition };
}
