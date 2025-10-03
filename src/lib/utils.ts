
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

const NBSP = '\u00A0';

/**
 * Converte uma string de dinheiro em formato BRL (ex: "12.112,45") para um número float (ex: 12112.45).
 * Esta função é projetada para limpar e converter a entrada do usuário para armazenamento no banco de dados.
 */
export function parseBRLMoneyToFloat(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }
  if (typeof input !== 'string' || !input) {
    return null;
  }

  // 1. Remove tudo exceto dígitos e a vírgula decimal.
  const cleanedString = input.replace(/[^\d,]/g, '');

  // 2. Substitui a vírgula por um ponto para criar um formato numérico padrão.
  const numericString = cleanedString.replace(',', '.');

  // 3. Converte para um número de ponto flutuante.
  const numberValue = parseFloat(numericString);

  // Retorna o número se for válido, caso contrário, retorna null.
  return Number.isFinite(numberValue) ? numberValue : null;
}
