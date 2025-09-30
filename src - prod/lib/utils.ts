
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskCnpj(value?: string | null) {
  if (!value) return ""
  return value
    .replace(/\D/g, '') // Remove todos os caracteres não numéricos
    .slice(0, 14) // Limita a 14 dígitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskProjectAccount(value: string) {
    if (!value) return "";
    value = value.replace(/\D/g, ''); // Remove all non-digits

    if (value.length > 7) {
        value = value.substring(0, 7);
    }
    
    // Dynamically apply mask based on length
    if (value.length > 6) {
        // ######-#
        return value.replace(/(\d{6})(\d)/, '$1-$2');
    }
    // No specific mask for 6, so it remains #.####-#
    if (value.length > 5) {
        // #####-#
        return value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    if (value.length > 1) {
        // ####-# through #-#
        return value.replace(/(\d{1,5})(\d)/, '$1-$2');
    }
    
    return value;
}
