import { type ClassValue } from "clsx";

export function maskCnpj(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskProjectAccount(value: string): string {
  if (!value) return "";
  const cleanedValue = value.replace(/\D/g, "").substring(0, 7);
  if (cleanedValue.length > 1) {
    return cleanedValue.replace(/(\d{1,6})(\d{1})$/, "$1-$2");
  }
  return cleanedValue;
}

export function parseBRLMoneyToFloat(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input !== "string" || !input) {
    return null;
  }
  const cleanedString = input.replace(/[^\d,]/g, "");
  const numericString = cleanedString.replace(",", ".");
  const numberValue = parseFloat(numericString);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function formatBRLMoney(
  amount: number | null | undefined,
  options: { includeSymbol?: boolean } = {}
): string {
  const { includeSymbol = true } = options;
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "N/A";
  }
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formattedValue = formatter.format(amount);
  return includeSymbol ? formattedValue : formattedValue.replace("R$", "").trim();
}