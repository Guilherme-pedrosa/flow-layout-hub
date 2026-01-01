import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Save, FileKey, Building2, Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ConfiguracaoNFe() {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [certificadoInfo, setCertificadoInfo] = useState<any>(null);
  
  // Configurações NF-e
  const [configNfe, setConfigNfe] = useState({
    ambiente: 'homologacao',
    serie_nfe: 1,
    proximo_numero: 1,
    csc_id: '',
    csc_token: '',
  });

  // Configurações NFS-e
  const [configNfse, setConfigNfse] = useState({
    ambiente: 'homologacao',
    serie_nfse: 1,
    proximo_numero: 1,
    inscricao_municipal: '',
    codigo_municipio: '5201108', // Anápolis-GO
    regime_tributacao: '1',
    optante_simples: false,
  });

  // Certificado
  const [certificado, setCertificado] = useState({
    arquivo: null as File | null,
    senha: '',
  });

  useEffect(() => {
    if (currentCompany?.id) {
      carregarConfiguracoes();
    }
  }, [currentCompany?.id]);

  const carregarConfiguracoes = async () => {
    try {
      // Carregar config NF-e
      const { data: nfeData } = await supabase
        .from('nfe_config')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (nfeData) {
        setConfigNfe({
          ambiente: nfeData.ambiente || 'homologacao',
          serie_nfe: parseInt(String(nfeData.serie_nfe)) || 1,
          proximo_numero: nfeData.proximo_numero || 1,
          csc_id: nfeData.csc_id || '',
          csc_token: nfeData.csc_token || '',
        });
      }

      // Carregar config NFS-e
      const { data: nfseData } = await supabase
        .from('nfse_config')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (nfseData) {
        setConfigNfse({
          ambiente: nfseData.ambiente || 'homologacao',
          serie_nfse: parseInt(String(nfseData.serie_nfse)) || 1,
          proximo_numero: nfseData.proximo_numero || 1,
          inscricao_municipal: nfseData.inscricao_municipal || '',
          codigo_municipio: nfseData.codigo_municipio || '5201108',
          regime_tributacao: nfseData.regime_tributacao || '1',
          optante_simples: nfseData.optante_simples || false,
        });
      }

      // Carregar info do certificado
      const { data: certData } = await supabase
        .from('certificados_digitais')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (certData) {
        setCertificadoInfo({
          razao_social: certData.razao_social,
          cnpj: certData.cnpj,
          validade: certData.validade,
          uploaded_at: certData.created_at,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const salvarConfigNfe = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('nfe_config')
        .upsert([{
          company_id: currentCompany?.id,
          ambiente: configNfe.ambiente,
          serie_nfe: String(configNfe.serie_nfe),
          proximo_numero: configNfe.proximo_numero,
          csc_id: configNfe.csc_id,
          csc_token: configNfe.csc_token,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'company_id' });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'Configurações de NF-e atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfigNfse = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('nfse_config')
        .upsert([{
          company_id: currentCompany?.id,
          ambiente: configNfse.ambiente,
          serie_nfse: String(configNfse.serie_nfse),
          proximo_numero: configNfse.proximo_numero,
          inscricao_municipal: configNfse.inscricao_municipal,
          codigo_municipio: configNfse.codigo_municipio,
          regime_tributacao: configNfse.regime_tributacao,
          optante_simples: configNfse.optante_simples,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'company_id' });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'Configurações de NFS-e atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadCertificado = async () => {
    if (!certificado.arquivo || !certificado.senha) {
      toast({
        title: 'Erro',
        description: 'Selecione o arquivo do certificado e informe a senha.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];

        // Salvar no banco
        const { error } = await supabase
          .from('certificados_digitais')
          .upsert([{
            company_id: currentCompany?.id,
            certificado_base64: base64,
            senha: certificado.senha,
            updated_at: new Date().toISOString(),
          }], { onConflict: 'company_id' });

        if (error) throw error;

        toast({
          title: 'Certificado enviado',
          description: 'Certificado digital A1 configurado com sucesso.',
        });

        // Recarregar info
        carregarConfiguracoes();
        setCertificado({ arquivo: null, senha: '' });
      };

      reader.readAsDataURL(certificado.arquivo);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Configure a emissão de NF-e e NFS-e para {currentCompany?.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="certificado" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="certificado" className="flex items-center gap-2">
            <FileKey className="h-4 w-4" />
            Certificado Digital
          </TabsTrigger>
          <TabsTrigger value="nfe" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            NF-e (Produtos)
          </TabsTrigger>
          <TabsTrigger value="nfse" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            NFS-e (Serviços)
          </TabsTrigger>
        </TabsList>

        {/* Tab Certificado Digital */}
        <TabsContent value="certificado">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital A1</CardTitle>
              <CardDescription>
                Faça o upload do seu certificado digital A1 (.pfx) para emissão de notas fiscais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {certificadoInfo ? (
                <Alert>
                  <FileKey className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Certificado ativo:</strong> {certificadoInfo.razao_social}<br />
                    <strong>CNPJ:</strong> {certificadoInfo.cnpj}<br />
                    <strong>Validade:</strong> {certificadoInfo.validade ? new Date(certificadoInfo.validade).toLocaleDateString() : 'N/A'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum certificado digital configurado. Faça o upload para emitir notas fiscais.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="certificado">Arquivo do Certificado (.pfx)</Label>
                  <Input
                    id="certificado"
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => setCertificado({ ...certificado, arquivo: e.target.files?.[0] || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha do Certificado</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Digite a senha do certificado"
                    value={certificado.senha}
                    onChange={(e) => setCertificado({ ...certificado, senha: e.target.value })}
                  />
                </div>

                <Button onClick={uploadCertificado} disabled={loading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar Certificado'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab NF-e */}
        <TabsContent value="nfe">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de NF-e</CardTitle>
              <CardDescription>
                Configure a emissão de Nota Fiscal Eletrônica de produtos (SEFAZ).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={configNfe.ambiente}
                    onValueChange={(value) => setConfigNfe({ ...configNfe, ambiente: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Série</Label>
                  <Input
                    type="number"
                    value={configNfe.serie_nfe}
                    onChange={(e) => setConfigNfe({ ...configNfe, serie_nfe: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Próximo Número</Label>
                  <Input
                    type="number"
                    value={configNfe.proximo_numero}
                    onChange={(e) => setConfigNfe({ ...configNfe, proximo_numero: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">NFC-e (Cupom Fiscal)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CSC ID</Label>
                    <Input
                      value={configNfe.csc_id}
                      onChange={(e) => setConfigNfe({ ...configNfe, csc_id: e.target.value })}
                      placeholder="ID do CSC"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CSC Token</Label>
                    <Input
                      type="password"
                      value={configNfe.csc_token}
                      onChange={(e) => setConfigNfe({ ...configNfe, csc_token: e.target.value })}
                      placeholder="Token do CSC"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={salvarConfigNfe} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab NFS-e */}
        <TabsContent value="nfse">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de NFS-e</CardTitle>
              <CardDescription>
                Configure a emissão de Nota Fiscal de Serviço Eletrônica (Padrão Nacional).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={configNfse.ambiente}
                    onValueChange={(value) => setConfigNfse({ ...configNfse, ambiente: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Inscrição Municipal <span className="text-red-500">*</span></Label>
                  <Input
                    value={configNfse.inscricao_municipal}
                    onChange={(e) => setConfigNfse({ ...configNfse, inscricao_municipal: e.target.value })}
                    placeholder="Número da inscrição municipal"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Código do Município (IBGE)</Label>
                  <Input
                    value={configNfse.codigo_municipio}
                    onChange={(e) => setConfigNfse({ ...configNfse, codigo_municipio: e.target.value })}
                    placeholder="5201108 (Anápolis-GO)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Série</Label>
                  <Input
                    type="number"
                    value={configNfse.serie_nfse}
                    onChange={(e) => setConfigNfse({ ...configNfse, serie_nfse: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Próximo Número</Label>
                  <Input
                    type="number"
                    value={configNfse.proximo_numero}
                    onChange={(e) => setConfigNfse({ ...configNfse, proximo_numero: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regime de Tributação</Label>
                  <Select
                    value={configNfse.regime_tributacao}
                    onValueChange={(value) => setConfigNfse({ ...configNfse, regime_tributacao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Microempresa Municipal</SelectItem>
                      <SelectItem value="2">Estimativa</SelectItem>
                      <SelectItem value="3">Sociedade de Profissionais</SelectItem>
                      <SelectItem value="4">Cooperativa</SelectItem>
                      <SelectItem value="5">MEI</SelectItem>
                      <SelectItem value="6">ME/EPP Simples Nacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={salvarConfigNfse} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
