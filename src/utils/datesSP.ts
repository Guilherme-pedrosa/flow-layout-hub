/**
 * Utilitários de data para timezone America/Sao_Paulo
 */

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso de São Paulo
 */
export function todayYMDinSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Retorna uma data N dias atrás no formato YYYY-MM-DD no fuso de São Paulo
 */
export function daysAgoYMDinSP(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Retorna o primeiro dia do mês atual no formato YYYY-MM-DD no fuso de São Paulo
 */
export function firstDayOfMonthYMDinSP(): string {
  const now = new Date();
  const spDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${spDate.getFullYear()}-${String(spDate.getMonth() + 1).padStart(2, '0')}-01`;
}
