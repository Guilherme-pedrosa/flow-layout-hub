// Formatadores para campos do sistema

export function formatCpfCnpj(value: string, tipoPessoa?: 'PF' | 'PJ'): string {
  const digits = value.replace(/\D/g, '');
  
  // Usa tipoPessoa se fornecido, senão decide pelo tamanho
  const isCnpj = tipoPessoa === 'PJ' || (!tipoPessoa && digits.length > 11);
  
  if (!isCnpj) {
    // CPF: 000.000.000-00
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 10) {
    // (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
}

export function cleanDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    // Se for uma data no formato YYYY-MM-DD (sem horário), parse manualmente para evitar problemas de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    // Se tiver horário, usar o parsing normal
    const d = new Date(date);
    return new Intl.DateTimeFormat('pt-BR').format(d);
  }
  return new Intl.DateTimeFormat('pt-BR').format(date);
}
