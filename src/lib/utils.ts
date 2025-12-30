import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número como moeda brasileira
 * @param value - Valor numérico
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata um número com separadores de milhar
 * @param value - Valor numérico
 * @returns String formatada (ex: "1.234")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Calcula a variação percentual entre dois valores
 * @param current - Valor atual
 * @param previous - Valor anterior
 * @returns Número representando a porcentagem (ex: 15.5 para +15.5%)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Retorna a classe CSS para a cor do trend
 * @param trend - Direção da tendência
 * @returns String com classes Tailwind
 */
export function getTrendColorClass(trend: 'up' | 'down' | 'neutral'): string {
  const colors = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-50',
  };
  return colors[trend];
}

/**
 * Retorna as datas de início e fim do mês atual
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Retorna array de datas dos últimos N dias
 * @param days - Número de dias
 */
export function getLastNDays(days: number): Date[] {
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(subDays(new Date(), i));
  }
  return dates;
}

/**
 * Formata uma data para exibição
 */
export function formatDateLabel(date: Date): string {
  return format(date, 'dd/MM', { locale: ptBR });
}

/**
 * Formata uma data no formato ISO
 */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
