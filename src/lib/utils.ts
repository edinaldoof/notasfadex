import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskCnpj(value: string) {
  if (!value) return ""
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1")
}

export function parseBRLMoneyToFloat(value: string | null | undefined): number {
  if (!value) return 0;
  const cleanedValue = value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const floatValue = parseFloat(cleanedValue);
  return isNaN(floatValue) ? 0 : floatValue;
}