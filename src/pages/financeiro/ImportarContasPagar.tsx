import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  suppliers_created: number;
}

export default function ImportarContasPagar() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipForecast, setSkipForecast] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    const headers = lines[0].split(";").map(h => h.trim());
    
    // Mapear índices das colunas do GC
    const colMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      const hLower = h.toLowerCase();
      if (hLower.includes("emissao") || hLower.includes("emissão")) colMap.emissao = i;
      if (hLower.includes("vencimento")) colMap.vencimento = i;
      if (hLower.includes("valor") && !hLower.includes("pago")) colMap.valor = i;
      if (hLower.includes("fornecedor") || hLower.includes("cliente") || hLower.includes("nome")) colMap.fornecedor = i;
      if (hLower.includes("cnpj") || hLower.includes("cpf")) colMap.cpf_cnpj = i;
      if (hLower.includes("historico") || hLower.includes("histórico") || hLower.includes("descricao")) colMap.historico = i;
      if (hLower.includes("documento") || hLower.includes("nf")) colMap.documento = i;
      if (hLower.includes("categoria") || hLower.includes("plano")) colMap.categoria = i;
      if (hLower.includes("forma") && hLower.includes("pag")) colMap.forma_pagamento = i;
      if (hLower.includes("previsao") || hLower.includes("previsão")) colMap.previsao = i;
      if (hLower.includes("parcela") && !hLower.includes("total")) colMap.parcela = i;
      if (hLower.includes("total") && hLower.includes("parcela")) colMap.total_parcelas = i;
    });

    // Se não encontrou pelo nome, usar índices padrão do GC
    if (Object.keys(colMap).length < 5) {
      // Formato padrão GC: Empresa;Codigo;Emissao;Vencimento;Valor;ValorPago;...;Fornecedor;...
      colMap.emissao = 2;
      colMap.vencimento = 3;
      colMap.valor = 4;
      colMap.fornecedor = 12; // Nome do fornecedor
      colMap.cpf_cnpj = 13;
      colMap.historico = 17;
      colMap.documento = 19;
      colMap.categoria = 23;
      colMap.forma_pagamento = 25;
      colMap.previsao = 27;
      colMap.parcela = 21;
      colMap.total_parcelas = 22;
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(";");
      if (cols.length < 5) continue;

      const previsaoVal = cols[colMap.previsao]?.trim().toLowerCase();
      
      data.push({
        emissao: cols[colMap.emissao]?.trim() || "",
        vencimento: cols[colMap.vencimento]?.trim() || "",
        valor: cols[colMap.valor]?.trim() || "0",
        fornecedor: cols[colMap.fornecedor]?.trim() || "Não identificado",
        cpf_cnpj: cols[colMap.cpf_cnpj]?.trim() || "",
        historico: cols[colMap.historico]?.trim() || "",
        documento: cols[colMap.documento]?.trim() || "",
        categoria: cols[colMap.categoria]?.trim() || "",
        forma_pagamento: cols[colMap.forma_pagamento]?.trim() || "",
        previsao: previsaoVal === "true" || previsaoVal === "1" || previsaoVal === "sim",
        parcela: parseInt(cols[colMap.parcela]) || 1,
        total_parcelas: parseInt(cols[colMap.total_parcelas]) || 1,
      });
    }

    return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum dado encontrado no arquivo",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("import-payables", {
        body: { csvData, skipForecast },
      });

      if (error) throw error;

      setResult(data.results);

      toast({
        title: "Importação concluída",
        description: `${data.results.imported} contas importadas com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Importe contas a pagar de um arquivo CSV (formato Gestão Click)
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Arquivo CSV
            </CardTitle>
            <CardDescription>
              Selecione o arquivo CSV exportado do Gestão Click
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            {file && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipForecast"
                checked={skipForecast}
                onCheckedChange={(checked) => setSkipForecast(checked as boolean)}
              />
              <Label htmlFor="skipForecast" className="text-sm">
                Ignorar contas com previsão (recomendado)
              </Label>
            </div>

            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Contas
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.errors.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{result.imported + result.skipped} / {result.total}</span>
                </div>
                <Progress value={((result.imported + result.skipped) / result.total) * 100} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                  <div className="text-sm text-green-700">Importadas</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{result.skipped}</div>
                  <div className="text-sm text-gray-700">Ignoradas (previsão)</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{result.suppliers_created}</div>
                  <div className="text-sm text-blue-700">Fornecedores criados</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-sm text-red-700">Erros</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Erros encontrados:</Label>
                  <div className="max-h-40 overflow-y-auto text-sm text-red-600 bg-red-50 p-2 rounded">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                    {result.errors.length > 10 && (
                      <div className="text-gray-500">
                        ... e mais {result.errors.length - 10} erros
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formato esperado do CSV</CardTitle>
          <CardDescription>
            O sistema aceita o formato padrão de exportação do Gestão Click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Colunas reconhecidas automaticamente:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Emissão</strong> - Data de emissão (DD/MM/YYYY)</li>
              <li><strong>Vencimento</strong> - Data de vencimento (DD/MM/YYYY)</li>
              <li><strong>Valor</strong> - Valor da conta</li>
              <li><strong>Fornecedor/Cliente</strong> - Nome do fornecedor</li>
              <li><strong>CNPJ/CPF</strong> - Documento do fornecedor</li>
              <li><strong>Histórico</strong> - Descrição da conta</li>
              <li><strong>Documento</strong> - Número do documento/NF</li>
              <li><strong>Categoria</strong> - Categoria/Plano de contas</li>
              <li><strong>Forma de Pagamento</strong> - PIX, Boleto, Cartão, etc</li>
              <li><strong>Previsão</strong> - Se é previsão (True/False)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
