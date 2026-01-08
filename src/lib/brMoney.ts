/**
 * Módulo centralizado para formatação e parsing de valores monetários no padrão BR
 * 
 * REGRAS IMUTÁVEIS:
 * - Vírgula como decimal (ex: 96,70)
 * - Ponto como milhar (ex: 1.234,56)
 * - Moeda BRL com R$ (ex: R$ 96,70)
 * - Banco recebe number (decimal) sem máscara
 */

const brFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brNumberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brNumber4Formatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/**
 * Formata número para moeda BRL (R$ 1.234,56)
 * @param value - Valor numérico ou null/undefined
 * @param showZero - Se true, mostra R$ 0,00 para null/undefined. Default: true
 */
export function formatBRL(value: number | null | undefined, showZero = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return showZero ? 'R$ 0,00' : '';
  }
  return brFormatter.format(value);
}

/**
 * Formata número no padrão BR SEM símbolo de moeda (1.234,56)
 * @param value - Valor numérico ou null/undefined
 * @param decimals - Número de casas decimais (2 ou 4)
 */
export function formatBRNumber(value: number | null | undefined, decimals: 2 | 4 = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return decimals === 4 
    ? brNumber4Formatter.format(value)
    : brNumberFormatter.format(value);
}

/**
 * Parse de string BR para número
 * Aceita: "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "1,234.56"
 * Retorna null se vazio ou inválido
 * 
 * NUNCA usar parseFloat direto no input sem esta função!
 */
export function parseBRNumber(input: string | null | undefined): number | null {
  if (!input || typeof input !== "string") return null;

  let cleaned = input
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .trim();

  if (cleaned === "" || cleaned === "-") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  // Se tem os dois, o separador decimal é o ÚLTIMO que aparece
  if (hasComma && hasDot) {
    const decimalIsComma = lastComma > lastDot;

    if (decimalIsComma) {
      // 1.234,56  -> remove milhares "." e troca decimal "," por "."
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56  -> remove milhares "," e mantém decimal "."
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // 1234,56 -> decimal ","
    cleaned = cleaned.replace(",", ".");
  }
  // só ponto ou nenhum -> parseFloat resolve

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Arredonda para 2 casas decimais (financeiro)
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Arredonda para 4 casas decimais (custo unitário)
 */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Formata para exibição em input (sem R$, com vírgula decimal)
 * Usado para exibir valor atual no campo editável
 */
export function formatForInput(value: number | null | undefined, decimals: 2 | 4 = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return formatBRNumber(value, decimals);
}
