
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskCnpj(value: string) {
  if (!value) return ""
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
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
    } else if (value.length > 5) {
        // #####-#
        return value.replace(/(\d{5})(\d)/, '$1-$2');
    } else if (value.length > 4) {
        // ####-#
        return value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    return value;
}
