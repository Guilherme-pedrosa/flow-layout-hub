import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface Chamado {
  id: string;
  company_id: string;
  os_numero: string;
  os_data: string | null;
  distrito: string | null;
  tecnico_nome: string | null;
  cliente_codigo: string | null;
  cliente_nome: string | null;
  tra_nome: string | null;
  client_id: string | null;
  service_order_id: string | null;
  status: 'aberto' | 'em_execucao' | 'concluido' | 'cancelado';
  imported_from: string;
  imported_at: string;
  imported_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  cliente?: { razao_social: string | null; nome_fantasia: string | null } | null;
  service_order?: { order_number: number | null; status_id: string | null } | null;
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
  tecnico_nome: string | null;
  cliente_codigo: string | null;
  cliente_nome: string | null;
  tra_nome: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTRATÉGIA ANCHOR-BASED - Buscar Rótulo → Extrair Valor Vizinho
// Resiliente a deslocamento de colunas no template Excel
// ═══════════════════════════════════════════════════════════════════════════

interface CellCoords {
  row: number;
  col: number;
}

// Mapeamento de âncoras conforme documentação oficial
const ANCHOR_MAP = {
  os_numero: { anchor: "Nº", fallback: "H2", direction: "right" },
  os_data: { anchor: "DATA ABERTURA:", fallback: "F3", direction: "right" },
  distrito: { anchor: "CÓD. DISTRITO", fallback: "H5", direction: "right" },
  tecnico_nome: { anchor: "NOME DO SOLICITANTE", fallback: "E6", direction: "right" },
  cliente_codigo: { anchor: "CÓD. JDE DO CLIENTE", fallback: "E14", direction: "right" },
  cliente_nome: { anchor: "NOME DO CLIENTE", fallback: "E15", direction: "right" },
  tra_nome: { anchor: "NOME DO TRA:", fallback: "G31", direction: "right" },
} as const;

// Helper para converter endereço de célula (ex: "A1") para coordenadas
function cellToCoords(cell: string): CellCoords {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 0, col: 0 };
  
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2], 10) - 1, col: col - 1 };
}

// Helper para converter coordenadas para endereço de célula
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

// Buscar coordenadas de uma célula que contém o texto âncora (case insensitive)
function findAnchorCell(sheet: XLSX.WorkSheet, anchorText: string): CellCoords | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
  const searchText = anchorText.toLowerCase().trim();
  
  for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) { // Limitar a 50 linhas
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

// Extrair valor usando estratégia ANCHOR-BASED com fallback
function extractValueByAnchor(
  sheet: XLSX.WorkSheet, 
  anchorText: string, 
  fallbackCell: string,
  direction: "right" | "below" = "right"
): string | null {
  // Tentar encontrar âncora
  const anchorCoords = findAnchorCell(sheet, anchorText);
  
  let targetCell: string;
  
  if (anchorCoords) {
    // Âncora encontrada - pegar valor vizinho
    if (direction === "right") {
      targetCell = coordsToCell(anchorCoords.row, anchorCoords.col + 1);
    } else {
      targetCell = coordsToCell(anchorCoords.row + 1, anchorCoords.col);
    }
  } else {
    // Fallback para célula fixa
    targetCell = fallbackCell;
    console.warn(`[ANCHOR] Âncora "${anchorText}" não encontrada, usando fallback: ${fallbackCell}`);
  }
  
  const cell = sheet[targetCell];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return null;
  }
  return String(cell.v).trim();
}

// Extrair data com tratamento especial (string ISO ou serial Excel)
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
  
  // Se é número (serial date do Excel)
  if (typeof cell.v === 'number') {
    const date = XLSX.SSF.parse_date_code(cell.v);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  // Se é Date
  if (cell.v instanceof Date) {
    return cell.v;
  }
  
  // Se é string
  if (typeof cell.v === 'string') {
    const str = cell.v.trim();
    
    // Tentar ISO 8601 primeiro (2025-01-07)
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime()) && str.includes('-')) {
      return isoDate;
    }
    
    // Tentar formato BR dd/mm/yyyy
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

// Função principal para extrair dados do Excel usando ANCHOR-BASED
export function parseExcelChamado(file: File): Promise<ExcelChamadoData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Usar primeira aba disponível
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        if (!sheet) {
          reject(new Error('Planilha vazia ou inválida.'));
          return;
        }
        
        console.log('[ANCHOR] Iniciando extração anchor-based...');
        console.log('[ANCHOR] Aba:', workbook.SheetNames[0]);
        
        // ═══════════════════════════════════════════════════════════════
        // EXTRAÇÃO ANCHOR-BASED - Conforme mapeamento oficial
        // ═══════════════════════════════════════════════════════════════
        
        const os_numero = extractValueByAnchor(sheet, ANCHOR_MAP.os_numero.anchor, ANCHOR_MAP.os_numero.fallback);
        const os_data = extractDateByAnchor(sheet, ANCHOR_MAP.os_data.anchor, ANCHOR_MAP.os_data.fallback);
        const distrito = extractValueByAnchor(sheet, ANCHOR_MAP.distrito.anchor, ANCHOR_MAP.distrito.fallback);
        const tecnico_nome = extractValueByAnchor(sheet, ANCHOR_MAP.tecnico_nome.anchor, ANCHOR_MAP.tecnico_nome.fallback);
        const cliente_codigo = extractValueByAnchor(sheet, ANCHOR_MAP.cliente_codigo.anchor, ANCHOR_MAP.cliente_codigo.fallback);
        const cliente_nome = extractValueByAnchor(sheet, ANCHOR_MAP.cliente_nome.anchor, ANCHOR_MAP.cliente_nome.fallback);
        const tra_nome = extractValueByAnchor(sheet, ANCHOR_MAP.tra_nome.anchor, ANCHOR_MAP.tra_nome.fallback);
        
        console.log('[ANCHOR] Dados extraídos:', { os_numero, os_data, distrito, tecnico_nome, cliente_codigo, cliente_nome, tra_nome });
        
        // Validação obrigatória
        if (!os_numero) {
          reject(new Error('Campo obrigatório "Nº" (os_numero) não encontrado. Verifique se o Excel segue o template oficial Ecolab.'));
          return;
        }
        
        resolve({
          os_numero,
          os_data,
          distrito,
          tecnico_nome,
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
  
  // Buscar logs do chamado
  const getChamadoLogs = async (chamadoId: string): Promise<ChamadoLog[]> => {
    const { data, error } = await supabase
      .from('chamado_logs')
      .select(`
        *,
        user:users(name)
      `)
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data as ChamadoLog[];
  };
  
  // Adicionar log
  const addLog = async (chamadoId: string, action: string, metadata?: Record<string, unknown>) => {
    if (!currentCompany?.id) return;
    
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
    
    await supabase.from('chamado_logs').insert({
      chamado_id: chamadoId,
      action,
      metadata: metadata || null,
      created_by: userId,
    } as any);
  };
  
  // Importar chamado do Excel
  const importChamado = useMutation({
    mutationFn: async (file: File) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Parsear Excel
      const excelData = await parseExcelChamado(file);
      
      // Verificar duplicado
      const { data: existing } = await supabase
        .from('chamados')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('os_numero', excelData.os_numero)
        .single();
      
      if (existing) {
        throw new Error(`Chamado OS ${excelData.os_numero} já existe. Duplicados não são permitidos.`);
      }
      
      // Tentar encontrar cliente
      let clientId: string | null = null;
      if (excelData.cliente_codigo || excelData.cliente_nome) {
        // Primeiro por código
        if (excelData.cliente_codigo) {
          const { data: clientByCodigo } = await supabase
            .from('clientes')
            .select('id')
            .eq('company_id', currentCompany.id)
            .or(`cpf_cnpj.eq.${excelData.cliente_codigo},inscricao_estadual.eq.${excelData.cliente_codigo}`)
            .limit(1)
            .maybeSingle();
          
          if (clientByCodigo) clientId = clientByCodigo.id;
        }
        
        // Fallback por nome
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
      }
      
      // Buscar usuário atual
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
      
      // Inserir chamado
      const { data: chamado, error: insertError } = await supabase
        .from('chamados')
        .insert({
          company_id: currentCompany.id,
          os_numero: excelData.os_numero,
          os_data: excelData.os_data?.toISOString().split('T')[0] || null,
          distrito: excelData.distrito,
          tecnico_nome: excelData.tecnico_nome,
          cliente_codigo: excelData.cliente_codigo,
          cliente_nome: excelData.cliente_nome,
          tra_nome: excelData.tra_nome,
          client_id: clientId,
          imported_by: userId,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Log de importação
      await addLog(chamado.id, 'imported', {
        file_name: file.name,
        excel_data: excelData,
        client_matched: !!clientId,
      });
      
      return { chamado, clientMatched: !!clientId, excelData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      
      if (result.clientMatched) {
        toast.success(`Chamado OS ${result.excelData.os_numero} importado com sucesso!`);
      } else {
        toast.warning(`Chamado OS ${result.excelData.os_numero} importado, mas cliente não foi encontrado no WAI.`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  // Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Chamado['status'] }) => {
      const { data: chamadoAntes } = await supabase
        .from('chamados')
        .select('status')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('chamados')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      await addLog(id, 'status_changed', {
        from: chamadoAntes?.status,
        to: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Status atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });
  
  // Gerar OS vinculada
  const gerarOS = useMutation({
    mutationFn: async (chamadoId: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Buscar chamado
      const chamado = await getChamadoById(chamadoId);
      if (!chamado) throw new Error('Chamado não encontrado');
      
      if (chamado.service_order_id) {
        throw new Error('Este chamado já possui uma OS vinculada');
      }
      
      // Criar OS
      const { data: os, error: osError } = await supabase
        .from('service_orders')
        .insert({
          company_id: currentCompany.id,
          client_id: chamado.client_id,
          description: `Chamado Ecolab OS ${chamado.os_numero} - ${chamado.tra_nome || 'Sem TRA'}`,
          notes: `Importado do Excel\nDistrito: ${chamado.distrito || '-'}\nTécnico: ${chamado.tecnico_nome || '-'}`,
          scheduled_date: chamado.os_data || null,
        })
        .select('id, order_number')
        .single();
      
      if (osError) throw osError;
      
      // Vincular OS ao chamado
      const { error: updateError } = await supabase
        .from('chamados')
        .update({ service_order_id: os.id })
        .eq('id', chamadoId);
      
      if (updateError) throw updateError;
      
      // Log
      await addLog(chamadoId, 'linked_os', {
        service_order_id: os.id,
        order_number: os.order_number,
      });
      
      return os;
    },
    onSuccess: (os) => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success(`OS ${os.order_number} criada e vinculada`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  return {
    chamados,
    isLoading,
    refetch,
    getChamadoById,
    getChamadoLogs,
    importChamado,
    updateStatus,
    gerarOS,
  };
}
