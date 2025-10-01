
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
 * Converte textos de dinheiro em BRL para float com ponto como separador decimal.
 * Regras:
 * - Remove a moeda (R$) e espaços (inclui NBSP)
 * - Se houver vírgula e ponto: ponto = milhar, vírgula = decimal
 * - Se houver apenas vírgula: vírgula = decimal
 * - Se houver apenas ponto: trata como decimal SOMENTE se houver exatamente 1 ponto e 1-2 dígitos finais; caso contrário, assume milhar e remove
 * - Garante no máximo 2 casas
 */
export function parseBRLMoneyToFloat(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string') return null;

  let s = input
    .replace(new RegExp(NBSP, 'g'), ' ')
    .replace(/\s+/g, '')
    .replace(/r\$|brl|reais|real/gi, '') // usa flag 'i' para case-insensitive
    .replace(/[^0-9.,-]/g, ''); // mantém dígitos e separadores

  // Sinal negativo, se houver
  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1);
  }

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // 1.234,56 => remove pontos de milhar e troca vírgula por ponto
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // 748,60 => troca vírgula por ponto
    s = s.replace(',', '.');
  } else if (!hasComma && hasDot) {
    // Caso ambíguo: 1234.56 (provável decimal) OU 1.234 (provável milhar)
    const lastDot = s.lastIndexOf('.');
    const decimals = s.length - lastDot - 1;
    // Se houver exatamente 1 ponto e 1-2 dígitos depois dele, considera decimal; senão remove pontos
    if (s.indexOf('.') === lastDot && (decimals === 1 || decimals === 2)) {
      // já está no formato correto
    } else {
      s = s.replace(/\./g, '');
    }
  }

  // Garante no máximo 2 casas decimais, truncando (não arredonda para evitar divergências com a nota)
  const m = s.match(/^(\d+)(?:\.(\d{1,2}))?.*$/);
  if (!m) {
    // Tenta remover separadores residuais de milhar e reavaliar
    const s2 = s.replace(/[.,]/g, '');
    const m2 = s2.match(/^(\d+)$/);
     if (!m2) return null;
     const num2 = Number(m2[1]);
     return Number.isFinite(num2) ? sign * num2 : null;
  }
  
  const integerPart = m[1];
  const decimalPart = m[2] ? m[2].padEnd(2, '0') : '00';
  
  const num = Number(`${integerPart}.${decimalPart}`);
  
  return Number.isFinite(num) ? sign * Math.trunc(num * 100) / 100 : null;
}
