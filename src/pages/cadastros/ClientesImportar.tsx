import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/shared";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  ArrowLeft,
  ArrowRight,
  FileWarning,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientesImportExport, ImportRow } from "@/hooks/useClientesImportExport";

type Step = 'upload' | 'validation' | 'confirmation' | 'result';

export default function ClientesImportar() {
  const navigate = useNavigate();
  const {
    loading,
    downloadTemplate,
    parseFile,
    revalidateRow,
    downloadErrorReport,
    importClientes,
  } = useClientesImportExport();

  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const validCount = rows.filter(r => r.status === 'valid').length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setProcessingFile(true);
    try {
      const parsedRows = await parseFile(file);
      setRows(parsedRows);
      setStep('validation');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar o arquivo. Verifique se está no formato correto.');
    } finally {
      setProcessingFile(false);
    }
  };

  const handleCellEdit = async (rowIndex: number, field: keyof ImportRow, value: string) => {
    const updatedRows = [...rows];
    (updatedRows[rowIndex] as any)[field] = value;
    
    // Revalidar a linha
    const revalidated = await revalidateRow(updatedRows[rowIndex], updatedRows);
    updatedRows[rowIndex] = revalidated;
    
    setRows(updatedRows);
  };

  const handleConfirmImport = async () => {
    setStep('confirmation');
  };

  const handleExecuteImport = async () => {
    setImportProgress(0);
    
    // Simular progresso
    const interval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    const importResult = await importClientes(rows);
    
    clearInterval(interval);
    setImportProgress(100);
    setResult(importResult);
    setStep('result');
  };

  const getTotalSteps = () => 3;
  const getCurrentStepNumber = () => {
    switch (step) {
      case 'upload': return 1;
      case 'validation': return 2;
      case 'confirmation': return 3;
      case 'result': return 3;
      default: return 1;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Importar Clientes (Passo ${getCurrentStepNumber()} de ${getTotalSteps()})`}
        description="Importe clientes a partir de uma planilha Excel"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Clientes", href: "/clientes" },
          { label: "Importar" },
        ]}
      />

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload do Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground">
                Faça o download do nosso template para garantir que seus dados estejam no formato correto.
                Em seguida, arraste seu arquivo .xlsx para a área abaixo ou clique para selecionar.
              </p>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {processingFile ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className={cn(
                    "h-12 w-12 mx-auto mb-4",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-lg font-medium mb-1">
                    {isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo Excel aqui"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou clique para selecionar (.xlsx, .xls)
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/clientes')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Validation */}
      {step === 'validation' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Linhas</p>
                    <p className="text-2xl font-bold">{rows.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Válidos</p>
                    <p className="text-2xl font-bold text-success">{validCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Com Erros</p>
                    <p className="text-2xl font-bold text-destructive">{errorCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Nome Fantasia</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>UF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow
                        key={row.rowNumber}
                        className={cn(
                          row.status === 'error' && "bg-destructive/5"
                        )}
                      >
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge className="bg-success/10 text-success border-success/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Válido
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Erro
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="list-disc list-inside text-sm">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.razao_social}
                            onChange={(e) => handleCellEdit(index, 'razao_social', e.target.value)}
                            className={cn(
                              "h-8 text-sm",
                              row.errors.some(e => e.includes('Razão')) && "border-destructive"
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.nome_fantasia}
                            onChange={(e) => handleCellEdit(index, 'nome_fantasia', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cnpj_cpf}
                            onChange={(e) => handleCellEdit(index, 'cnpj_cpf', e.target.value)}
                            className={cn(
                              "h-8 text-sm font-mono",
                              row.errors.some(e => e.includes('CPF') || e.includes('CNPJ')) && "border-destructive"
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.email}
                            onChange={(e) => handleCellEdit(index, 'email', e.target.value)}
                            className={cn(
                              "h-8 text-sm",
                              row.errors.some(e => e.includes('mail')) && "border-destructive"
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.telefone}
                            onChange={(e) => handleCellEdit(index, 'telefone', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.cidade}
                            onChange={(e) => handleCellEdit(index, 'cidade', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.uf}
                            onChange={(e) => handleCellEdit(index, 'uf', e.target.value)}
                            className="h-8 text-sm w-16"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/clientes')}>
                <X className="h-4 w-4 mr-2" />
                Cancelar Importação
              </Button>
              {errorCount > 0 && (
                <Button variant="outline" onClick={() => downloadErrorReport(rows)}>
                  <FileWarning className="h-4 w-4 mr-2" />
                  Baixar Relatório de Erros
                </Button>
              )}
            </div>
            <Button
              onClick={handleConfirmImport}
              disabled={validCount === 0}
            >
              Importar {validCount} Válidos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Confirmar Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {importProgress === 0 ? (
              <>
                <div className="bg-muted/50 rounded-lg p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      Você está prestes a importar <strong>{validCount}</strong> novos clientes.
                    </p>
                    {errorCount > 0 && (
                      <p className="text-muted-foreground mt-1">
                        {errorCount} clientes com erro não serão importados.
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Deseja continuar?
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('validation')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={handleExecuteImport} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Importação
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">Importando clientes...</p>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              Importação Concluída!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-success/5 border border-success/20 rounded-lg p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg">
                <strong>{result.success}</strong> clientes foram importados com sucesso.
              </p>
              {errorCount > 0 && (
                <p className="text-muted-foreground mt-1">
                  {errorCount} clientes continham erros e não foram importados.
                </p>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate('/clientes')}>
                <Users className="h-4 w-4 mr-2" />
                Ver Clientes Importados
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setRows([]);
                  setResult(null);
                  setImportProgress(0);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Novo Arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
