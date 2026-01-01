import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Loader2,
  Users,
  Building2,
  Truck,
  Info,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

type TipoCadastro = "cliente" | "fornecedor" | "transportadora" | "todos";

interface ImportRow {
  [key: string]: string;
}

interface MappedRecord {
  tipo_pessoa?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  is_active?: boolean;
  is_cliente?: boolean;
  is_fornecedor?: boolean;
  is_transportadora?: boolean;
  _rowIndex?: number;
  _status?: "novo" | "duplicado" | "invalido";
  _existingId?: string;
  _error?: string;
}

interface ValidationResult {
  novos: MappedRecord[];
  duplicados: MappedRecord[];
  invalidos: MappedRecord[];
}

interface ColumnMapping {
  [systemField: string]: string | null;
}

const systemFields = [
  { key: "tipo_pessoa", label: "Tipo (PF/PJ)", required: false },
  { key: "razao_social", label: "Razão Social / Nome", required: true },
  { key: "nome_fantasia", label: "Nome Fantasia", required: false },
  { key: "cpf_cnpj", label: "CPF/CNPJ", required: false },
  { key: "inscricao_estadual", label: "Inscrição Estadual", required: false },
  { key: "inscricao_municipal", label: "Inscrição Municipal", required: false },
  { key: "telefone", label: "Telefone", required: false },
  { key: "celular", label: "Celular", required: false },
  { key: "email", label: "Email", required: false },
  { key: "cep", label: "CEP", required: false },
  { key: "logradouro", label: "Endereço", required: false },
  { key: "numero", label: "Número", required: false },
  { key: "bairro", label: "Bairro", required: false },
  { key: "complemento", label: "Complemento", required: false },
  { key: "cidade", label: "Cidade", required: false },
  { key: "estado", label: "Estado", required: false },
  { key: "observacoes", label: "Observações", required: false },
  { key: "is_active", label: "Situação (Ativo/Inativo)", required: false },
];

export default function ImportarPessoas() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  
  // Step control
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Type selection
  const [tipoCadastro, setTipoCadastro] = useState<TipoCadastro>("cliente");
  
  // Step 2: File upload
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<ImportRow[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Step 3: Column mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  
  // Step 4: Validation
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Step 5: Import options
  const [updateExisting, setUpdateExisting] = useState(false);
  const [allowMultipleSameCnpj, setAllowMultipleSameCnpj] = useState(true);
  const [ignoreWithoutName, setIgnoreWithoutName] = useState(true);
  const [markAllActive, setMarkAllActive] = useState(true);
  
  // Step 6: Import
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    ignored: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  const companyId = currentCompany?.id;

  // Auto-map columns based on header names
  const autoMapColumns = useCallback((columns: string[]) => {
    const mapping: ColumnMapping = {};
    const lowerColumns = columns.map(c => c.toLowerCase().trim());
    
    const mappings: { [key: string]: string[] } = {
      tipo_pessoa: ["tipo", "tipo pessoa", "pf/pj", "pessoa"],
      razao_social: ["razao social", "razão social", "nome", "nome completo"],
      nome_fantasia: ["nome fantasia", "fantasia", "apelido"],
      cpf_cnpj: ["cpf", "cnpj", "cpf/cnpj", "cpf_cnpj", "documento"],
      inscricao_estadual: ["ie", "inscricao estadual", "inscrição estadual", "insc est"],
      inscricao_municipal: ["im", "inscricao municipal", "inscrição municipal", "insc mun"],
      telefone: ["telefone", "tel", "fone"],
      celular: ["celular", "cel", "whatsapp"],
      email: ["email", "e-mail", "correio"],
      cep: ["cep"],
      logradouro: ["endereco", "endereço", "logradouro", "rua"],
      numero: ["numero", "número", "nro", "num"],
      bairro: ["bairro"],
      complemento: ["complemento", "compl"],
      cidade: ["cidade", "municipio", "município"],
      estado: ["estado", "uf"],
      observacoes: ["observacoes", "observações", "obs", "notas"],
      is_active: ["situacao", "situação", "status", "ativo"],
    };

    for (const [field, aliases] of Object.entries(mappings)) {
      const foundIndex = lowerColumns.findIndex(col => 
        aliases.some(alias => col.includes(alias))
      );
      if (foundIndex !== -1) {
        mapping[field] = columns[foundIndex];
      }
    }

    setColumnMapping(mapping);
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsLoadingFile(true);
    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet, { defval: "" });
      
      if (jsonData.length === 0) {
        toast.error("O arquivo está vazio");
        setIsLoadingFile(false);
        return;
      }

      // Get columns from first row
      const columns = Object.keys(jsonData[0]);
      
      setRawData(jsonData);
      setFileColumns(columns);
      autoMapColumns(columns);
      
      toast.success(`Arquivo carregado: ${jsonData.length} registros encontrados`);
      setCurrentStep(3);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Erro ao ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Normalize CPF/CNPJ
  const normalizeCpfCnpj = (value: string): string => {
    if (!value) return "";
    return value.replace(/[^\d]/g, "");
  };

  // Validate CPF/CNPJ format
  const isValidCpfCnpj = (value: string): boolean => {
    if (!value) return true; // Empty is valid (not required)
    const clean = normalizeCpfCnpj(value);
    return clean.length === 11 || clean.length === 14;
  };

  // Map raw data to system fields
  const mapDataToRecords = (): MappedRecord[] => {
    return rawData.map((row, index) => {
      const record: MappedRecord = {
        _rowIndex: index + 2, // +2 for header row and 1-based index
      };

      // Map each field
      for (const [field, sourceColumn] of Object.entries(columnMapping)) {
        if (sourceColumn && row[sourceColumn] !== undefined) {
          const value = String(row[sourceColumn]).trim();
          
          if (field === "is_active") {
            record.is_active = value.toLowerCase() === "ativo" || value === "1" || value.toLowerCase() === "sim" || value.toLowerCase() === "true" || value === "";
          } else if (field === "tipo_pessoa") {
            record.tipo_pessoa = value.toUpperCase().includes("PF") ? "PF" : "PJ";
          } else if (field === "cpf_cnpj") {
            record.cpf_cnpj = normalizeCpfCnpj(value);
          } else {
            (record as any)[field] = value;
          }
        }
      }

      // Set tipo_cadastro flags
      if (tipoCadastro === "cliente" || tipoCadastro === "todos") {
        record.is_cliente = true;
      }
      if (tipoCadastro === "fornecedor" || tipoCadastro === "todos") {
        record.is_fornecedor = true;
      }
      if (tipoCadastro === "transportadora" || tipoCadastro === "todos") {
        record.is_transportadora = true;
      }

      // Apply markAllActive
      if (markAllActive) {
        record.is_active = true;
      }

      return record;
    });
  };

  // Validate records against database
  const validateRecords = async () => {
    if (!companyId) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    setIsValidating(true);

    try {
      const records = mapDataToRecords();
      
      // Filter out records without name if option is set
      const filteredRecords = ignoreWithoutName 
        ? records.filter(r => r.razao_social || r.nome_fantasia)
        : records;

      // Get all existing records by cpf_cnpj
      const cpfCnpjList = filteredRecords
        .filter(r => r.cpf_cnpj)
        .map(r => r.cpf_cnpj!);

      let existingRecords: any[] = [];
      if (cpfCnpjList.length > 0) {
        const { data, error } = await supabase
          .from("pessoas")
          .select("id, cpf_cnpj, nome_fantasia, razao_social")
          .eq("company_id", companyId)
          .in("cpf_cnpj", cpfCnpjList);

        if (error) throw error;
        existingRecords = data || [];
      }

      const novos: MappedRecord[] = [];
      const duplicados: MappedRecord[] = [];
      const invalidos: MappedRecord[] = [];

      for (const record of filteredRecords) {
        // Check for invalid records
        if (!record.razao_social && !record.nome_fantasia) {
          record._status = "invalido";
          record._error = "Nome/Razão Social é obrigatório";
          invalidos.push(record);
          continue;
        }

        // Check CPF/CNPJ format (warning only)
        if (record.cpf_cnpj && !isValidCpfCnpj(record.cpf_cnpj)) {
          record._error = "CPF/CNPJ inválido (formato incorreto)";
        }

        // Check for duplicates (by cpf_cnpj + nome_fantasia)
        if (record.cpf_cnpj && !allowMultipleSameCnpj) {
          const existing = existingRecords.find(e => 
            e.cpf_cnpj === record.cpf_cnpj && 
            (e.nome_fantasia === record.nome_fantasia || e.razao_social === record.razao_social)
          );

          if (existing) {
            record._status = "duplicado";
            record._existingId = existing.id;
            duplicados.push(record);
            continue;
          }
        } else if (record.cpf_cnpj) {
          // With allowMultipleSameCnpj, only check exact match (cpf + nome)
          const existing = existingRecords.find(e => 
            e.cpf_cnpj === record.cpf_cnpj && 
            e.nome_fantasia === record.nome_fantasia
          );

          if (existing) {
            record._status = "duplicado";
            record._existingId = existing.id;
            duplicados.push(record);
            continue;
          }
        }

        record._status = "novo";
        novos.push(record);
      }

      setValidationResult({ novos, duplicados, invalidos });
      setCurrentStep(5);
      
      toast.success(`Validação concluída: ${novos.length} novos, ${duplicados.length} duplicados, ${invalidos.length} inválidos`);
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erro ao validar registros");
    } finally {
      setIsValidating(false);
    }
  };

  // Execute import
  const executeImport = async () => {
    if (!companyId || !validationResult) return;

    setIsImporting(true);
    setImportProgress(0);

    const toImport = [
      ...validationResult.novos,
      ...(updateExisting ? validationResult.duplicados : [])
    ];

    const result = {
      imported: 0,
      updated: 0,
      ignored: validationResult.invalidos.length + (updateExisting ? 0 : validationResult.duplicados.length),
      errors: [] as { row: number; error: string }[]
    };

    try {
      for (let i = 0; i < toImport.length; i++) {
        const record = toImport[i];
        setImportProgress(Math.round((i / toImport.length) * 100));

        try {
          const data = {
            company_id: companyId,
            tipo_pessoa: (record.tipo_pessoa === "PF" ? "PF" : "PJ") as "PF" | "PJ",
            razao_social: record.razao_social || record.nome_fantasia,
            nome_fantasia: record.nome_fantasia,
            cpf_cnpj: record.cpf_cnpj || null,
            inscricao_estadual: record.inscricao_estadual || null,
            inscricao_municipal: record.inscricao_municipal || null,
            telefone: record.telefone || record.celular || null,
            email: record.email || null,
            cep: record.cep || null,
            logradouro: record.logradouro || null,
            numero: record.numero || null,
            bairro: record.bairro || null,
            complemento: record.complemento || null,
            cidade: record.cidade || null,
            estado: record.estado || null,
            observacoes_internas: record.observacoes || null,
            is_active: record.is_active ?? true,
            is_cliente: record.is_cliente ?? false,
            is_fornecedor: record.is_fornecedor ?? false,
            is_transportadora: record.is_transportadora ?? false,
          };

          if (record._status === "duplicado" && record._existingId && updateExisting) {
            // Update existing
            const { error } = await supabase
              .from("pessoas")
              .update(data)
              .eq("id", record._existingId);

            if (error) throw error;
            result.updated++;
          } else {
            // Insert new
            const { error } = await supabase
              .from("pessoas")
              .insert([data]);

            if (error) throw error;
            result.imported++;
          }
        } catch (error: any) {
          result.errors.push({
            row: record._rowIndex || i + 1,
            error: error.message || "Erro desconhecido"
          });
        }
      }

      setImportProgress(100);
      setImportResult(result);
      setCurrentStep(6);
      
      toast.success(`Importação concluída! ${result.imported} importados, ${result.updated} atualizados`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro durante a importação");
    } finally {
      setIsImporting(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      {
        "Tipo": "PJ",
        "Nome Fantasia": "Empresa Exemplo LTDA",
        "Razão Social": "EMPRESA EXEMPLO COMERCIO LTDA",
        "CNPJ": "12.345.678/0001-90",
        "CPF": "",
        "IE": "123.456.789.012",
        "IM": "1234567",
        "Situação": "Ativo",
        "Telefone": "(11) 3456-7890",
        "Celular": "(11) 99876-5432",
        "Email": "contato@empresa.com.br",
        "CEP": "01310-100",
        "Endereço": "Av. Paulista",
        "Número": "1000",
        "Bairro": "Bela Vista",
        "Complemento": "Sala 101",
        "Cidade": "São Paulo",
        "Estado": "SP",
        "Observações": "Cliente desde 2020"
      },
      {
        "Tipo": "PF",
        "Nome Fantasia": "",
        "Razão Social": "João da Silva",
        "CNPJ": "",
        "CPF": "123.456.789-00",
        "IE": "",
        "IM": "",
        "Situação": "Ativo",
        "Telefone": "",
        "Celular": "(11) 98765-4321",
        "Email": "joao@email.com",
        "CEP": "04567-000",
        "Endereço": "Rua das Flores",
        "Número": "123",
        "Bairro": "Jardim",
        "Complemento": "Apt 45",
        "Cidade": "São Paulo",
        "Estado": "SP",
        "Observações": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pessoas");

    // Add instructions sheet
    const instructions = [
      { "Instruções de Preenchimento": "1. Preencha os campos conforme necessário" },
      { "Instruções de Preenchimento": "2. O campo Nome Fantasia ou Razão Social é obrigatório" },
      { "Instruções de Preenchimento": "3. Use 'PF' para Pessoa Física ou 'PJ' para Pessoa Jurídica" },
      { "Instruções de Preenchimento": "4. CPF/CNPJ pode incluir pontuação (será removida automaticamente)" },
      { "Instruções de Preenchimento": "5. Situação: use 'Ativo' ou 'Inativo'" },
      { "Instruções de Preenchimento": "6. Estado: use a sigla (SP, RJ, MG, etc.)" },
    ];
    const wsInstr = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instruções");

    XLSX.writeFile(wb, "modelo_importacao_pessoas.xlsx");
    toast.success("Planilha modelo baixada com sucesso!");
  };

  // Download error report
  const downloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const errorData = importResult.errors.map(e => ({
      "Linha": e.row,
      "Erro": e.error
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Erros");
    XLSX.writeFile(wb, "relatorio_erros_importacao.xlsx");
    toast.success("Relatório de erros baixado!");
  };

  // Reset to start
  const resetImport = () => {
    setCurrentStep(1);
    setFile(null);
    setRawData([]);
    setFileColumns([]);
    setColumnMapping({});
    setValidationResult(null);
    setImportResult(null);
    setImportProgress(0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Importar Pessoas</h1>
            <p className="text-muted-foreground">
              Importe clientes, fornecedores e transportadoras de planilhas Excel ou CSV
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Planilha Modelo
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                currentStep >= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {step < 6 && (
              <div
                className={`h-0.5 w-8 ${
                  currentStep > step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-4 text-sm text-muted-foreground">
          {currentStep === 1 && "Tipo de Cadastro"}
          {currentStep === 2 && "Upload do Arquivo"}
          {currentStep === 3 && "Mapeamento de Colunas"}
          {currentStep === 4 && "Validação"}
          {currentStep === 5 && "Opções de Importação"}
          {currentStep === 6 && "Resultado"}
        </span>
      </div>

      {/* Step 1: Type Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Tipo de Cadastro</CardTitle>
            <CardDescription>
              Escolha qual tipo de pessoa será importada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={tipoCadastro}
              onValueChange={(v) => setTipoCadastro(v as TipoCadastro)}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="cliente" id="cliente" />
                <Label htmlFor="cliente" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Users className="h-5 w-5 text-primary" />
                  Cliente
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="fornecedor" id="fornecedor" />
                <Label htmlFor="fornecedor" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-5 w-5 text-primary" />
                  Fornecedor
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="transportadora" id="transportadora" />
                <Label htmlFor="transportadora" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Truck className="h-5 w-5 text-primary" />
                  Transportadora
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="todos" id="todos" />
                <Label htmlFor="todos" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Todos
                </Label>
              </div>
            </RadioGroup>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Ao selecionar "Todos", os registros serão marcados como Cliente, Fornecedor e Transportadora simultaneamente.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(2)}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: File Upload */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx) ou CSV (.csv)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              {isLoadingFile ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p>Carregando arquivo...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-4">
                  <FileSpreadsheet className="h-12 w-12 text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{rawData.length} registros encontrados</p>
                  <Button variant="outline" onClick={() => {
                    setFile(null);
                    setRawData([]);
                    setFileColumns([]);
                  }}>
                    Escolher outro arquivo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Arraste um arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .csv</p>
                  </div>
                  <Input
                    type="file"
                    accept=".xlsx,.csv"
                    className="max-w-xs"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Voltar
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={!file || rawData.length === 0}
              >
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              Associe as colunas do seu arquivo aos campos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemFields.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <Label className="w-40 flex-shrink-0">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select
                    value={columnMapping[field.key] || ""}
                    onValueChange={(value) => 
                      setColumnMapping(prev => ({ ...prev, [field.key]: value || null }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Ignorar --</SelectItem>
                      {fileColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">Preview (primeiras 5 linhas)</h4>
              <ScrollArea className="h-48 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fileColumns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {fileColumns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap">
                            {String(row[col] || "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Voltar
              </Button>
              <Button 
                onClick={validateRecords}
                disabled={!columnMapping.razao_social && !columnMapping.nome_fantasia}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Validation is done automatically, skip to 5 */}

      {/* Step 5: Import Options & Summary */}
      {currentStep === 5 && validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Validação</CardTitle>
            <CardDescription>
              Verifique os dados e configure as opções de importação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-success/10 border-success/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold">{validationResult.novos.length}</p>
                    <p className="text-sm text-muted-foreground">Novos registros</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-warning/10 border-warning/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <div>
                    <p className="text-2xl font-bold">{validationResult.duplicados.length}</p>
                    <p className="text-sm text-muted-foreground">Duplicados</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">{validationResult.invalidos.length}</p>
                    <p className="text-sm text-muted-foreground">Inválidos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Import Options */}
            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Opções de Importação</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="updateExisting" 
                  checked={updateExisting}
                  onCheckedChange={(v) => setUpdateExisting(!!v)}
                />
                <Label htmlFor="updateExisting">
                  Atualizar registros existentes (duplicados por CNPJ/CPF + Nome)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="allowMultipleSameCnpj" 
                  checked={allowMultipleSameCnpj}
                  onCheckedChange={(v) => setAllowMultipleSameCnpj(!!v)}
                />
                <Label htmlFor="allowMultipleSameCnpj">
                  Permitir múltiplos cadastros com mesmo CNPJ (nomes diferentes)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ignoreWithoutName" 
                  checked={ignoreWithoutName}
                  onCheckedChange={(v) => setIgnoreWithoutName(!!v)}
                />
                <Label htmlFor="ignoreWithoutName">
                  Ignorar registros sem nome
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="markAllActive" 
                  checked={markAllActive}
                  onCheckedChange={(v) => setMarkAllActive(!!v)}
                />
                <Label htmlFor="markAllActive">
                  Marcar todos como ativos
                </Label>
              </div>
            </div>

            {/* Duplicates List */}
            {validationResult.duplicados.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Registros Duplicados
                </h4>
                <ScrollArea className="h-40 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.duplicados.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row._rowIndex}</TableCell>
                          <TableCell>{row.razao_social || row.nome_fantasia}</TableCell>
                          <TableCell>{row.cpf_cnpj}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-warning/10 text-warning">
                              {updateExisting ? "Atualizar" : "Ignorar"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Invalid List */}
            {validationResult.invalidos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Registros Inválidos (serão ignorados)
                </h4>
                <ScrollArea className="h-40 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.invalidos.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row._rowIndex}</TableCell>
                          <TableCell className="text-destructive">{row._error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Voltar
              </Button>
              <Button 
                onClick={executeImport}
                disabled={isImporting || validationResult.novos.length + (updateExisting ? validationResult.duplicados.length : 0) === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando... {importProgress}%
                  </>
                ) : (
                  `Importar ${validationResult.novos.length + (updateExisting ? validationResult.duplicados.length : 0)} registros`
                )}
              </Button>
            </div>

            {isImporting && (
              <Progress value={importProgress} className="w-full" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Result */}
      {currentStep === 6 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-success" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Result Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-success/10 border-success/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{importResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                </CardContent>
              </Card>
              <Card className="bg-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{importResult.ignored}</p>
                  <p className="text-sm text-muted-foreground">Ignorados</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-destructive">{importResult.errors.length}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
            </div>

            {/* Errors List */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-destructive">Erros durante a importação</h4>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Relatório
                  </Button>
                </div>
                <ScrollArea className="h-40 border rounded-lg border-destructive/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="text-destructive">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetImport}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Nova Importação
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/clientes")}>
                  Ver Clientes
                </Button>
                <Button variant="outline" onClick={() => navigate("/fornecedores")}>
                  Ver Fornecedores
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
