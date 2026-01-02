import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Plug, RefreshCw, CheckCircle, AlertCircle, Loader2, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

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
  const executarFieldControl = async (action: 'status' | 'migrate' | 'reset') => {
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    setLoading(`field-${action}`);
    setFieldControlResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-gc-field', {
        body: { action, company_id: currentCompany.id, limit: 50 }
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
        
        if (data.has_more) {
          toast.success(`${data.summary.criados} clientes criados. Clique novamente para continuar.`);
        } else {
          toast.success("Migração para Field Control concluída!");
        }
      } else if (action === 'reset' && data.success) {
        setMigrationProgress(null);
        toast.success("Migração resetada!");
      }
    } catch (err: any) {
      console.error("Erro Field Control:", err);
      toast.error(err.message || "Erro ao executar ação Field Control");
      setFieldControlResult({ success: false, error: err.message });
    } finally {
      setLoading(null);
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
              disabled={!!loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading === 'field-migrate' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {migrationProgress && migrationProgress.migrated > 0 
                ? 'Continuar Migração' 
                : 'Iniciar Migração'}
            </Button>

            <Button
              onClick={() => executarFieldControl('reset')}
              disabled={!!loading}
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
    </div>
  );
}
