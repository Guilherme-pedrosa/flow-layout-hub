import { useState, useRef } from "react";
import { PageHeader } from "@/components/shared";
import { Plug, RefreshCw, CheckCircle, AlertCircle, Loader2, Upload, ArrowRight, Link2, FileSpreadsheet, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from 'xlsx';

export default function Integracoes() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [fieldControlResult, setFieldControlResult] = useState<any>(null);
  const [migrationProgress, setMigrationProgress] = useState<{
    total: number;
    migrated: number;
    current_batch: number;
  } | null>(null);
  
  // Matching state
  const [matchingStatus, setMatchingStatus] = useState<any>(null);
  const [matchingResults, setMatchingResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const executarMigracao = async (action: string) => {
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    setLoading(action);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-gestaoclick', {
        body: { action, company_id: currentCompany.id }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast.success(data.message || "Migração concluída com sucesso!");
      } else {
        toast.error(data.error || "Erro na migração");
      }
    } catch (err: any) {
      console.error("Erro na migração:", err);
      toast.error(err.message || "Erro ao executar migração");
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(null);
    }
  };

  // ===== FIELD CONTROL =====
  const [autoMigrating, setAutoMigrating] = useState(false);
  
  const executarFieldControl = async (action: 'status' | 'migrate' | 'reset', autoMode = false) => {
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    if (!autoMode) {
      setLoading(`field-${action}`);
      setFieldControlResult(null);
    }

    try {
      const { data, error } = await supabase.functions.invoke('migrate-gc-field', {
        body: { action, company_id: currentCompany.id, limit: 200 }
      });

      if (error) throw error;

      setFieldControlResult(data);
      
      if (action === 'status' && data.success) {
        setMigrationProgress({
          total: data.total_clientes,
          migrated: data.ja_migrados,
          current_batch: 0
        });
        toast.info(`${data.ja_migrados}/${data.total_clientes} clientes já migrados`);
      } else if (action === 'migrate' && data.success) {
        setMigrationProgress({
          total: data.summary.total_clientes,
          migrated: data.summary.ja_migrados_antes + data.summary.criados,
          current_batch: data.summary.criados
        });
        
        if (data.has_more && autoMigrating) {
          // Auto-continuar após 1 segundo
          setTimeout(() => executarFieldControl('migrate', true), 1000);
        } else if (data.has_more && !autoMigrating) {
          toast.success(`${data.summary.criados} clientes criados. Clique novamente ou use "Migrar Tudo".`);
        } else {
          setAutoMigrating(false);
          setLoading(null);
          toast.success("Migração para Field Control concluída!");
        }
      } else if (action === 'reset' && data.success) {
        setMigrationProgress(null);
        setAutoMigrating(false);
        toast.success("Migração resetada!");
      }
    } catch (err: any) {
      console.error("Erro Field Control:", err);
      toast.error(err.message || "Erro ao executar ação Field Control");
      setFieldControlResult({ success: false, error: err.message });
      setAutoMigrating(false);
    } finally {
      if (!autoMigrating || action !== 'migrate') {
        setLoading(null);
      }
    }
  };

  const iniciarMigracaoCompleta = () => {
    setAutoMigrating(true);
    setLoading('field-migrate');
    executarFieldControl('migrate', true);
  };

  const pararMigracao = () => {
    setAutoMigrating(false);
    setLoading(null);
    toast.info("Migração pausada");
  };

  // ===== MATCHING FIELD CONTROL =====
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentCompany?.id) return;

    setLoading('import-xlsx');
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Importando ${jsonData.length} linhas do Excel...`);

      const { data: result, error } = await supabase.functions.invoke('field-match-customers', {
        body: { 
          action: 'import_snapshot', 
          company_id: currentCompany.id,
          snapshot_data: jsonData
        }
      });

      if (error) throw error;

      if (result.success) {
        toast.success(`${result.imported} clientes do Field importados!`);
        await fetchMatchingStatus();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      console.error("Erro importando Excel:", err);
      toast.error(err.message || "Erro ao importar planilha");
    } finally {
      setLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchMatchingStatus = async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('field-match-customers', {
        body: { action: 'status', company_id: currentCompany.id }
      });

      if (error) throw error;
      setMatchingStatus(data);
    } catch (err) {
      console.error("Erro buscando status:", err);
    }
  };

  const runMatching = async () => {
    if (!currentCompany?.id) return;

    setLoading('run-matching');
    
    try {
      const { data, error } = await supabase.functions.invoke('field-match-customers', {
        body: { action: 'run_matching', company_id: currentCompany.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setMatchingResults(data.results || []);
        await fetchMatchingStatus();
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar matching");
    } finally {
      setLoading(null);
    }
  };

  const applyMatches = async () => {
    if (!currentCompany?.id) return;

    setLoading('apply-matches');
    
    try {
      const { data, error } = await supabase.functions.invoke('field-match-customers', {
        body: { action: 'apply_matches', company_id: currentCompany.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        await fetchMatchingStatus();
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao aplicar matches");
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AUTO_LINK':
        return <Badge className="bg-green-500">Automático</Badge>;
      case 'REVIEW':
        return <Badge className="bg-yellow-500">Revisar</Badge>;
      case 'CREATE_NEW':
        return <Badge className="bg-blue-500">Criar Novo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const progressPercent = migrationProgress
    ? Math.round((migrationProgress.migrated / migrationProgress.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Configure integrações com sistemas externos"
        breadcrumbs={[
          { label: "Configurações" },
          { label: "Integrações" },
        ]}
      />

      {/* Gestão Click */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Gestão Click
          </CardTitle>
          <CardDescription>
            Importe clientes, fornecedores e transportadoras do Gestão Click para o WAI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => executarMigracao('clientes')}
              disabled={!!loading}
              variant="outline"
            >
              {loading === 'clientes' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Importar Clientes
            </Button>
            
            <Button
              onClick={() => executarMigracao('fornecedores')}
              disabled={!!loading}
              variant="outline"
            >
              {loading === 'fornecedores' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Importar Fornecedores
            </Button>
            
            <Button
              onClick={() => executarMigracao('transportadoras')}
              disabled={!!loading}
              variant="outline"
            >
              {loading === 'transportadoras' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Importar Transportadoras
            </Button>
            
            <Button
              onClick={() => executarMigracao('full')}
              disabled={!!loading}
            >
              {loading === 'full' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Importar Tudo
            </Button>
          </div>

          {result && (
            <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {result.success ? 'Migração concluída' : 'Erro na migração'}
                  </p>
                  <p className={`text-sm mt-1 ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {result.message || result.error}
                  </p>
                  
                  {result.stats && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {result.stats.clientes?.total > 0 && (
                        <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                          <strong>Clientes:</strong> {result.stats.clientes.importados} novos, {result.stats.clientes.atualizados} atualizados, {result.stats.clientes.erros} erros
                        </div>
                      )}
                      {result.stats.fornecedores?.total > 0 && (
                        <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                          <strong>Fornecedores:</strong> {result.stats.fornecedores.importados} novos, {result.stats.fornecedores.atualizados} atualizados, {result.stats.fornecedores.erros} erros
                        </div>
                      )}
                      {result.stats.transportadoras?.total > 0 && (
                        <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                          <strong>Transportadoras:</strong> {result.stats.transportadoras.importados} novos, {result.stats.transportadoras.atualizados} atualizados, {result.stats.transportadoras.erros} erros
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Field Control
          </CardTitle>
          <CardDescription>
            Migre clientes do WAI para o Field Control com código único GC-XXXX e anti-duplicação de CNPJ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          {migrationProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso da migração</span>
                <span className="font-medium">{migrationProgress.migrated} / {migrationProgress.total} ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => executarFieldControl('status')}
              disabled={!!loading}
              variant="outline"
            >
              {loading === 'field-status' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Ver Status
            </Button>

            <Button
              onClick={() => executarFieldControl('migrate')}
              disabled={!!loading || autoMigrating}
              variant="outline"
            >
              {loading === 'field-migrate' && !autoMigrating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              +200 Clientes
            </Button>

            {!autoMigrating ? (
              <Button
                onClick={iniciarMigracaoCompleta}
                disabled={!!loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading === 'field-migrate' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Migrar Tudo Automático
              </Button>
            ) : (
              <Button
                onClick={pararMigracao}
                variant="secondary"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausar Migração
              </Button>
            )}

            <Button
              onClick={() => executarFieldControl('reset')}
              disabled={!!loading || autoMigrating}
              variant="destructive"
              size="sm"
            >
              {loading === 'field-reset' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Resetar
            </Button>
          </div>

          {/* Resultado Field Control */}
          {fieldControlResult && (
            <div className={`mt-4 p-4 rounded-lg border ${fieldControlResult.success ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
              <div className="flex items-start gap-2">
                {fieldControlResult.success ? (
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${fieldControlResult.success ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>
                    {fieldControlResult.success ? 'Field Control' : 'Erro'}
                  </p>
                  <p className={`text-sm mt-1 ${fieldControlResult.success ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                    {fieldControlResult.message || fieldControlResult.error}
                  </p>
                  
                  {/* Summary */}
                  {fieldControlResult.summary && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="bg-white/50 dark:bg-black/20 rounded p-2 text-center">
                        <div className="font-bold text-lg">{fieldControlResult.summary.total_clientes}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded p-2 text-center">
                        <div className="font-bold text-lg text-green-600">{fieldControlResult.summary.criados}</div>
                        <div className="text-xs text-muted-foreground">Criados agora</div>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded p-2 text-center">
                        <div className="font-bold text-lg text-yellow-600">{fieldControlResult.summary.pulados}</div>
                        <div className="text-xs text-muted-foreground">Já existiam</div>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded p-2 text-center">
                        <div className="font-bold text-lg text-gray-600">{fieldControlResult.summary.pendentes_restantes}</div>
                        <div className="text-xs text-muted-foreground">Pendentes</div>
                      </div>
                    </div>
                  )}

                  {/* Mapeamento (primeiros 10) */}
                  {fieldControlResult.mapeamento && fieldControlResult.mapeamento.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-2">Últimos clientes criados:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono bg-black/5 dark:bg-white/5 rounded p-2">
                        {fieldControlResult.mapeamento.slice(0, 10).map((m: any, i: number) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-blue-600 font-bold">{m.codigo_unico}</span>
                            <span className="truncate flex-1">{m.nome_cliente}</span>
                            <span className="text-muted-foreground">{m.cnpj_enviado || '(sem CNPJ)'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Erros */}
                  {fieldControlResult.erros && fieldControlResult.erros.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-red-600 mb-2">Erros ({fieldControlResult.erros.length}):</p>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-xs font-mono bg-red-50 dark:bg-red-900/20 rounded p-2">
                        {fieldControlResult.erros.slice(0, 5).map((e: any, i: number) => (
                          <div key={i} className="text-red-600">
                            {e.codigo}: {e.erro}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Inteligente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Matching Inteligente WAI ↔ Field
          </CardTitle>
          <CardDescription>
            Vincule clientes existentes no Field aos do WAI sem criar duplicatas. Ideal para quem já tem equipamentos cadastrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          {matchingStatus && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div className="bg-muted rounded p-2 text-center">
                <div className="font-bold text-lg">{matchingStatus.snapshot_count}</div>
                <div className="text-xs text-muted-foreground">Clientes Field</div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 text-center">
                <div className="font-bold text-lg text-green-600">{matchingStatus.matching_results?.AUTO_LINK || 0}</div>
                <div className="text-xs text-muted-foreground">Automático</div>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded p-2 text-center">
                <div className="font-bold text-lg text-yellow-600">{matchingStatus.matching_results?.REVIEW || 0}</div>
                <div className="text-xs text-muted-foreground">Revisar</div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-center">
                <div className="font-bold text-lg text-blue-600">{matchingStatus.matching_results?.CREATE_NEW || 0}</div>
                <div className="text-xs text-muted-foreground">Criar Novo</div>
              </div>
              <div className="bg-muted rounded p-2 text-center">
                <div className="font-bold text-lg">{matchingStatus.synced_count}</div>
                <div className="text-xs text-muted-foreground">Já Vinculados</div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!loading}
              variant="outline"
            >
              {loading === 'import-xlsx' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              1. Importar Planilha Field
            </Button>

            <Button
              onClick={runMatching}
              disabled={!!loading || !matchingStatus?.snapshot_count}
              variant="outline"
            >
              {loading === 'run-matching' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              2. Executar Matching
            </Button>

            <Button
              onClick={applyMatches}
              disabled={!!loading || !matchingStatus?.matching_results?.AUTO_LINK}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading === 'apply-matches' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              3. Aplicar Vínculos
            </Button>

            <Button
              onClick={fetchMatchingStatus}
              disabled={!!loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Resultados do Matching */}
          {matchingResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium">
                Preview dos Matches (primeiros 50)
              </div>
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente WAI</TableHead>
                      <TableHead>Candidato Field</TableHead>
                      <TableHead className="w-20 text-center">Score</TableHead>
                      <TableHead>Razão</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.wai_name}</TableCell>
                        <TableCell>{r.field_candidate_name || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-bold ${
                            r.match_score >= 80 ? 'text-green-600' :
                            r.match_score >= 50 ? 'text-yellow-600' : 'text-gray-400'
                          }`}>
                            {r.match_score}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {r.match_reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(r.match_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
