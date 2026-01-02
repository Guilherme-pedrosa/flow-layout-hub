import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Plug, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export default function Integracoes() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Gestão Click
          </CardTitle>
          <CardDescription>
            Importe clientes, fornecedores e transportadoras do Gestão Click
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
    </div>
  );
}
