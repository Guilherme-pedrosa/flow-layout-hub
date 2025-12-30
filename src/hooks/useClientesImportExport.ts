import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { isValidCpfOrCnpj } from "@/lib/validators";
import { Cliente } from "./useClientes";

export interface ImportRow {
  rowNumber: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  inscricao_estadual: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: 'valid' | 'error';
  errors: string[];
}

export function useClientesImportExport() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Exportar clientes para xlsx
  const exportClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

      if (error) throw error;

      const exportData = (data || []).map((cliente) => ({
        razao_social: cliente.razao_social || "",
        nome_fantasia: cliente.nome_fantasia || "",
        cnpj_cpf: cliente.cpf_cnpj || "",
        inscricao_estadual: cliente.inscricao_estadual || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        cep: cliente.cep || "",
        logradouro: cliente.logradouro || "",
        numero: cliente.numero || "",
        complemento: cliente.complemento || "",
        bairro: cliente.bairro || "",
        cidade: cliente.cidade || "",
        uf: cliente.estado || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
      
      XLSX.writeFile(workbook, "clientes_exportados.xlsx");
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} clientes exportados com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Baixar template
  const downloadTemplate = () => {
    const templateData = [
      {
        razao_social: "Exemplo Empresa LTDA",
        nome_fantasia: "Exemplo",
        cnpj_cpf: "12345678000190",
        inscricao_estadual: "123456789",
        email: "contato@exemplo.com",
        telefone: "11999999999",
        cep: "01310100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        complemento: "Sala 101",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    XLSX.writeFile(workbook, "template_clientes.xlsx");
  };

  // Parsear arquivo xlsx
  const parseFile = async (file: File): Promise<ImportRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          // Buscar CNPJs existentes no banco
          const { data: existingClientes } = await supabase
            .from("clientes")
            .select("cpf_cnpj");
          
          const existingCpfCnpjs = new Set(
            (existingClientes || []).map(c => c.cpf_cnpj?.replace(/\D/g, '') || '')
          );

          // Verificar duplicados na própria planilha
          const planilhaCpfCnpjs = new Map<string, number>();
          
          const rows: ImportRow[] = jsonData.map((row: any, index: number) => {
            const errors: string[] = [];
            const cpfCnpj = String(row.cnpj_cpf || "").replace(/\D/g, '');
            
            // Validações
            if (!row.razao_social || String(row.razao_social).trim() === "") {
              errors.push("Razão Social é obrigatória");
            }
            
            if (!cpfCnpj) {
              errors.push("CPF/CNPJ é obrigatório");
            } else {
              if (!isValidCpfOrCnpj(cpfCnpj)) {
                errors.push("CPF/CNPJ inválido");
              }
              
              if (existingCpfCnpjs.has(cpfCnpj)) {
                errors.push("CPF/CNPJ já existe no banco de dados");
              }
              
              if (planilhaCpfCnpjs.has(cpfCnpj)) {
                errors.push(`CPF/CNPJ duplicado na planilha (linha ${planilhaCpfCnpjs.get(cpfCnpj)})`);
              }
              
              planilhaCpfCnpjs.set(cpfCnpj, index + 2);
            }
            
            // Validar email se preenchido
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
              errors.push("E-mail inválido");
            }

            return {
              rowNumber: index + 2,
              razao_social: String(row.razao_social || ""),
              nome_fantasia: String(row.nome_fantasia || ""),
              cnpj_cpf: cpfCnpj,
              inscricao_estadual: String(row.inscricao_estadual || ""),
              email: String(row.email || ""),
              telefone: String(row.telefone || ""),
              cep: String(row.cep || ""),
              logradouro: String(row.logradouro || ""),
              numero: String(row.numero || ""),
              complemento: String(row.complemento || ""),
              bairro: String(row.bairro || ""),
              cidade: String(row.cidade || ""),
              uf: String(row.uf || ""),
              status: errors.length > 0 ? 'error' : 'valid',
              errors,
            };
          });

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsBinaryString(file);
    });
  };

  // Revalidar linha individual
  const revalidateRow = async (row: ImportRow, allRows: ImportRow[]): Promise<ImportRow> => {
    const errors: string[] = [];
    const cpfCnpj = row.cnpj_cpf.replace(/\D/g, '');
    
    if (!row.razao_social || row.razao_social.trim() === "") {
      errors.push("Razão Social é obrigatória");
    }
    
    if (!cpfCnpj) {
      errors.push("CPF/CNPJ é obrigatório");
    } else {
      if (!isValidCpfOrCnpj(cpfCnpj)) {
        errors.push("CPF/CNPJ inválido");
      }
      
      // Verificar no banco
      const { data: existing } = await supabase
        .from("clientes")
        .select("id")
        .eq("cpf_cnpj", cpfCnpj)
        .limit(1);
      
      if (existing && existing.length > 0) {
        errors.push("CPF/CNPJ já existe no banco de dados");
      }
      
      // Verificar duplicados na planilha
      const duplicates = allRows.filter(
        r => r.rowNumber !== row.rowNumber && r.cnpj_cpf.replace(/\D/g, '') === cpfCnpj
      );
      if (duplicates.length > 0) {
        errors.push(`CPF/CNPJ duplicado na planilha`);
      }
    }
    
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push("E-mail inválido");
    }

    return {
      ...row,
      status: errors.length > 0 ? 'error' : 'valid',
      errors,
    };
  };

  // Gerar relatório de erros
  const downloadErrorReport = (rows: ImportRow[]) => {
    const errorRows = rows.filter(r => r.status === 'error').map(row => ({
      linha: row.rowNumber,
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia,
      cnpj_cpf: row.cnpj_cpf,
      inscricao_estadual: row.inscricao_estadual,
      email: row.email,
      telefone: row.telefone,
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      cidade: row.cidade,
      uf: row.uf,
      motivo_erro: row.errors.join("; "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Erros");
    
    XLSX.writeFile(workbook, "relatorio_erros_importacao.xlsx");
  };

  // Importar clientes válidos
  const importClientes = async (rows: ImportRow[]): Promise<{ success: number; failed: number }> => {
    setLoading(true);
    
    const validRows = rows.filter(r => r.status === 'valid');
    let success = 0;
    let failed = 0;

    try {
      const clientesToInsert = validRows.map(row => ({
        razao_social: row.razao_social,
        nome_fantasia: row.nome_fantasia || null,
        cpf_cnpj: row.cnpj_cpf,
        inscricao_estadual: row.inscricao_estadual || null,
        email: row.email || null,
        telefone: row.telefone || null,
        cep: row.cep || null,
        logradouro: row.logradouro || null,
        numero: row.numero || null,
        complemento: row.complemento || null,
        bairro: row.bairro || null,
        cidade: row.cidade || null,
        estado: row.uf || null,
        tipo_pessoa: (row.cnpj_cpf.length === 11 ? 'PF' : 'PJ') as 'PF' | 'PJ',
        status: 'ativo' as 'ativo' | 'inativo' | 'bloqueado',
      }));

      const { data, error } = await supabase
        .from("clientes")
        .insert(clientesToInsert)
        .select();

      if (error) throw error;
      
      success = data?.length || 0;
      failed = validRows.length - success;
      
      toast({
        title: "Importação concluída",
        description: `${success} clientes importados com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
      failed = validRows.length;
    } finally {
      setLoading(false);
    }

    return { success, failed };
  };

  return {
    loading,
    exportClientes,
    downloadTemplate,
    parseFile,
    revalidateRow,
    downloadErrorReport,
    importClientes,
  };
}
