import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Status do ecolab-chamados
export type ChamadoStatus = 
  | 'aguardando_agendamento' 
  | 'agendado' 
  | 'ag_retorno' 
  | 'atendido_ag_fechamento' 
  | 'fechado';

export const STATUS_CONFIG: Record<ChamadoStatus, { label: string; className: string; color: string }> = {
  aguardando_agendamento: { label: 'Aguardando agendamento', className: 'bg-yellow-500 text-white', color: '#eab308' },
  agendado: { label: 'Agendado - ag atendimento', className: 'bg-orange-500 text-white', color: '#f97316' },
  ag_retorno: { label: 'Ag retorno', className: 'bg-red-800 text-white', color: '#991b1b' },
  atendido_ag_fechamento: { label: 'Atendido - Ag fechamento', className: 'bg-green-400 text-white', color: '#4ade80' },
  fechado: { label: 'Fechado', className: 'bg-green-600 text-white', color: '#16a34a' },
};

export interface Chamado {
  id: string;
  company_id: string;
  os_numero: string;
  numero_tarefa: string | null;
  os_data: string | null;
  data_atendimento: string | null;
  data_fechamento: string | null;
  distrito: string | null;
  nome_gt: string | null;
  cliente_codigo: string | null;
  cliente_nome: string | null;
  tra_nome: string | null;
  tecnico_nome: string | null;
  observacao: string | null;
  client_id: string | null;
  service_order_id: string | null;
  status: ChamadoStatus;
  imported_from: string;
  imported_at: string;
  imported_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  cliente?: { razao_social: string | null; nome_fantasia: string | null } | null;
  service_order?: { order_number: number | null; status_id: string | null } | null;
}

export interface ChamadoEvolucao {
  id: string;
  chamado_id: string;
  descricao: string;
  status_anterior: string | null;
  status_novo: string | null;
  created_at: string;
  created_by: string | null;
  company_id: string;
  user?: { name: string | null } | null;
}

export interface ChamadoLog {
  id: string;
  chamado_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  user?: { name: string | null } | null;
}

interface ExcelChamadoData {
  os_numero: string;
  os_data: Date | null;
  distrito: string | null;
  nome_gt: string | null;
  cliente_codigo: string | null;
  cliente_nome: string | null;
  tra_nome: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTRATÉGIA ANCHOR-BASED - Buscar Rótulo → Extrair Valor Vizinho
// ═══════════════════════════════════════════════════════════════════════════

interface CellCoords {
  row: number;
  col: number;
}

const ANCHOR_MAP = {
  os_numero: { anchor: "Nº", fallback: "H2", direction: "right" },
  os_data: { anchor: "DATA ABERTURA:", fallback: "F3", direction: "right" },
  distrito: { anchor: "CÓD. DISTRITO", fallback: "H5", direction: "right" },
  nome_gt: { anchor: "NOME DO GT", fallback: "E6", direction: "right" },
  cliente_codigo: { anchor: "CÓD. CLIENTE", fallback: "E8", direction: "right" },
  cliente_nome: { anchor: "UNIDADE DE ATENDIMENTO", fallback: "E15", direction: "right" },
  tra_nome: { anchor: "NOME DO TRA:", fallback: "G31", direction: "right" },
} as const;

function cellToCoords(cell: string): CellCoords {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 0, col: 0 };
  
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2], 10) - 1, col: col - 1 };
}

function coordsToCell(row: number, col: number): string {
  let colStr = '';
  let c = col + 1;
  while (c > 0) {
    c--;
    colStr = String.fromCharCode(65 + (c % 26)) + colStr;
    c = Math.floor(c / 26);
  }
  return `${colStr}${row + 1}`;
}

function findAnchorCell(sheet: XLSX.WorkSheet, anchorText: string): CellCoords | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
  const searchText = anchorText.toLowerCase().trim();
  
  for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = coordsToCell(row, col);
      const cell = sheet[cellAddr];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const cellValue = String(cell.v).toLowerCase().trim();
        if (cellValue.includes(searchText) || searchText.includes(cellValue)) {
          return { row, col };
        }
      }
    }
  }
  return null;
}

function extractValueByAnchor(
  sheet: XLSX.WorkSheet, 
  anchorText: string, 
  fallbackCell: string,
  direction: "right" | "below" = "right"
): string | null {
  const anchorCoords = findAnchorCell(sheet, anchorText);
  
  let targetCell: string;
  
  if (anchorCoords) {
    if (direction === "right") {
      targetCell = coordsToCell(anchorCoords.row, anchorCoords.col + 1);
    } else {
      targetCell = coordsToCell(anchorCoords.row + 1, anchorCoords.col);
    }
  } else {
    targetCell = fallbackCell;
  }
  
  const cell = sheet[targetCell];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return null;
  }
  return String(cell.v).trim();
}

function extractDateByAnchor(
  sheet: XLSX.WorkSheet,
  anchorText: string,
  fallbackCell: string
): Date | null {
  const anchorCoords = findAnchorCell(sheet, anchorText);
  
  let targetCell: string;
  if (anchorCoords) {
    targetCell = coordsToCell(anchorCoords.row, anchorCoords.col + 1);
  } else {
    targetCell = fallbackCell;
  }
  
  const cell = sheet[targetCell];
  if (!cell || cell.v === undefined || cell.v === null) return null;
  
  if (typeof cell.v === 'number') {
    const date = XLSX.SSF.parse_date_code(cell.v);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  if (cell.v instanceof Date) {
    return cell.v;
  }
  
  if (typeof cell.v === 'string') {
    const str = cell.v.trim();
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime()) && str.includes('-')) {
      return isoDate;
    }
    
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const brDate = new Date(y, m, d);
      if (!isNaN(brDate.getTime())) return brDate;
    }
  }
  
  return null;
}

export function parseExcelChamado(file: File): Promise<ExcelChamadoData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        if (!sheet) {
          reject(new Error('Planilha vazia ou inválida.'));
          return;
        }
        
        const os_numero = extractValueByAnchor(sheet, ANCHOR_MAP.os_numero.anchor, ANCHOR_MAP.os_numero.fallback);
        const os_data = extractDateByAnchor(sheet, ANCHOR_MAP.os_data.anchor, ANCHOR_MAP.os_data.fallback);
        const distrito = extractValueByAnchor(sheet, ANCHOR_MAP.distrito.anchor, ANCHOR_MAP.distrito.fallback);
        const nome_gt = extractValueByAnchor(sheet, ANCHOR_MAP.nome_gt.anchor, ANCHOR_MAP.nome_gt.fallback);
        const cliente_codigo = extractValueByAnchor(sheet, ANCHOR_MAP.cliente_codigo.anchor, ANCHOR_MAP.cliente_codigo.fallback);
        const cliente_nome = extractValueByAnchor(sheet, ANCHOR_MAP.cliente_nome.anchor, ANCHOR_MAP.cliente_nome.fallback);
        const tra_nome = extractValueByAnchor(sheet, ANCHOR_MAP.tra_nome.anchor, ANCHOR_MAP.tra_nome.fallback);
        
        if (!os_numero) {
          reject(new Error('Campo obrigatório "Nº" (os_numero) não encontrado.'));
          return;
        }
        
        resolve({
          os_numero,
          os_data,
          distrito,
          nome_gt,
          cliente_codigo,
          cliente_nome,
          tra_nome,
        });
      } catch (err) {
        reject(new Error('Erro ao processar arquivo Excel: ' + (err as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function useChamados() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  // Listar chamados
  const { data: chamados = [], isLoading, refetch } = useQuery({
    queryKey: ['chamados', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('chamados')
        .select(`
          *,
          cliente:clientes(razao_social, nome_fantasia),
          service_order:service_orders(order_number, status_id)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Chamado[];
    },
    enabled: !!currentCompany?.id,
  });
  
  // Buscar chamado por ID
  const getChamadoById = async (id: string): Promise<Chamado | null> => {
    const { data, error } = await supabase
      .from('chamados')
      .select(`
        *,
        cliente:clientes(razao_social, nome_fantasia),
        service_order:service_orders(order_number, status_id)
      `)
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data as Chamado;
  };
  
  // Buscar evoluções do chamado
  const getEvolucoes = async (chamadoId: string): Promise<ChamadoEvolucao[]> => {
    const { data, error } = await supabase
      .from('chamado_evolucoes')
      .select(`
        *,
        user:users(name)
      `)
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data as ChamadoEvolucao[];
  };
  
  // Adicionar evolução
  const addEvolucao = useMutation({
    mutationFn: async ({ 
      chamadoId, 
      descricao, 
      statusAnterior, 
      statusNovo 
    }: { 
      chamadoId: string; 
      descricao: string; 
      statusAnterior?: string | null; 
      statusNovo?: string | null;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: userData } = await supabase.auth.getUser();
      let userId: string | null = null;
      
      if (userData.user?.id) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user.id)
          .single();
        userId = user?.id || null;
      }
      
      // Inserir evolução
      const { error: evolucaoError } = await supabase
        .from('chamado_evolucoes')
        .insert({
          chamado_id: chamadoId,
          descricao,
          status_anterior: statusAnterior || null,
          status_novo: statusNovo || null,
          created_by: userId,
          company_id: currentCompany.id,
        });
      
      if (evolucaoError) throw evolucaoError;
      
      // Se tem status novo diferente, atualizar o chamado
      if (statusNovo && statusNovo !== statusAnterior) {
        const { error: updateError } = await supabase
          .from('chamados')
          .update({ status: statusNovo })
          .eq('id', chamadoId);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Evolução adicionada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar evolução: ' + error.message);
    },
  });
  
  // Importar chamado do Excel
  const importChamado = useMutation({
    mutationFn: async (file: File) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const excelData = await parseExcelChamado(file);
      
      // Verificar duplicado
      const { data: existing } = await supabase
        .from('chamados')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('os_numero', excelData.os_numero)
        .single();
      
      if (existing) {
        throw new Error(`Chamado OS ${excelData.os_numero} já existe.`);
      }
      
      // Tentar encontrar cliente
      let clientId: string | null = null;
      if (excelData.cliente_codigo) {
        const { data: clientByCodigo } = await supabase
          .from('clientes')
          .select('id')
          .eq('company_id', currentCompany.id)
          .ilike('cpf_cnpj', `%${excelData.cliente_codigo}%`)
          .limit(1)
          .maybeSingle();
        
        if (clientByCodigo) clientId = clientByCodigo.id;
      }
      
      if (!clientId && excelData.cliente_nome) {
        const { data: clientByNome } = await supabase
          .from('clientes')
          .select('id')
          .eq('company_id', currentCompany.id)
          .or(`razao_social.ilike.%${excelData.cliente_nome}%,nome_fantasia.ilike.%${excelData.cliente_nome}%`)
          .limit(1)
          .maybeSingle();
        
        if (clientByNome) clientId = clientByNome.id;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      let userId: string | null = null;
      
      if (userData.user?.id) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user.id)
          .single();
        userId = user?.id || null;
      }
      
      const { data: chamado, error: insertError } = await supabase
        .from('chamados')
        .insert({
          company_id: currentCompany.id,
          os_numero: excelData.os_numero,
          os_data: excelData.os_data?.toISOString().split('T')[0] || null,
          distrito: excelData.distrito,
          nome_gt: excelData.nome_gt,
          cliente_codigo: excelData.cliente_codigo,
          cliente_nome: excelData.cliente_nome,
          tra_nome: excelData.tra_nome,
          client_id: clientId,
          imported_by: userId,
          status: 'aguardando_agendamento',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return { chamado, clientMatched: !!clientId, excelData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success(`Chamado OS ${result.excelData.os_numero} importado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  // Atualizar chamado
  const updateChamado = useMutation({
    mutationFn: async ({ 
      id, 
      ...data 
    }: { 
      id: string; 
      numero_tarefa?: string | null;
      data_atendimento?: string | null;
      data_fechamento?: string | null;
      observacao?: string | null;
    }) => {
      const { error } = await supabase
        .from('chamados')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Chamado atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar chamado');
    },
  });
  
  // Excluir chamado
  const deleteChamado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chamados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Chamado excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir chamado');
    },
  });
  
  // Exportar para Excel
  const exportToExcel = async () => {
    if (!chamados.length) {
      toast.error('Nenhum chamado para exportar');
      return;
    }
    
    const exportData = chamados.map(c => ({
      'Nº OS': c.os_numero,
      'Nº Tarefa': c.numero_tarefa || '',
      'Data OS': c.os_data || '',
      'Data Atendimento': c.data_atendimento || '',
      'Data Fechamento': c.data_fechamento || '',
      'Distrito': c.distrito || '',
      'Nome GT': c.nome_gt || '',
      'Cód. Cliente': c.cliente_codigo || '',
      'Cliente': c.cliente_nome || '',
      'Nome TRA': c.tra_nome || '',
      'Observação': c.observacao || '',
      'Status': STATUS_CONFIG[c.status]?.label || c.status,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    
    const fileName = `chamados_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success('Planilha exportada com sucesso!');
  };
  
  // Calcular dias desde abertura
  const calcularDias = (dataOS: string | null): number => {
    if (!dataOS) return 0;
    const data = new Date(dataOS);
    const hoje = new Date();
    const diff = hoje.getTime() - data.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };
  
  return {
    chamados,
    isLoading,
    refetch,
    getChamadoById,
    getEvolucoes,
    addEvolucao,
    importChamado,
    updateChamado,
    deleteChamado,
    exportToExcel,
    calcularDias,
  };
}
