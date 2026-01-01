import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, FileText, CheckCircle, XCircle, Loader2, Key } from 'lucide-react';
import { PageHeader } from '@/components/shared';

export default function ConfiguracaoNFe() {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [focusToken, setFocusToken] = useState('');
  const [tokenValido, setTokenValido] = useState(false);
  
  const [configNfe, setConfigNfe] = useState({
    ambiente: 'homologacao',
    serie_nfe: 1,
    proximo_numero: 1,
    inscricao_estadual: '',
    regime_tributario: 'simples_nacional',
    natureza_operacao_padrao: 'Venda de mercadoria',
    cfop_padrao: '5102',
  });

  const [configNfse, setConfigNfse] = useState({
    ambiente: 'homologacao',
    serie_nfse: 1,
    proximo_numero: 1,
    inscricao_municipal: '',
    codigo_municipio: '5201108',
    regime_tributacao: '6',
    optante_simples: true,
  });

  const [certificadoInfo, setCertificadoInfo] = useState<{
    validade?: string;
    razao_social?: string;
  } | null>(null);

  useEffect(() => {
    if (currentCompany?.id) {
      carregarConfiguracoes();
    }
  }, [currentCompany]);

  const carregarConfiguracoes = async () => {
    try {
      // Carregar config NF-e
      const { data: nfeData } = await supabase
        .from('nfe_config')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (nfeData) {
        setFocusToken(nfeData.focus_token || '');
        setConfigNfe({
          ambiente: nfeData.ambiente || 'homologacao',
          serie_nfe: parseInt(String(nfeData.serie_nfe)) || 1,
          proximo_numero: nfeData.proximo_numero || 1,
          inscricao_estadual: nfeData.inscricao_estadual || '',
          regime_tributario: nfeData.regime_tributario || 'simples_nacional',
          natureza_operacao_padrao: nfeData.natureza_operacao_padrao || 'Venda de mercadoria',
          cfop_padrao: nfeData.cfop_padrao || '5102',
        });
        if (nfeData.focus_token) {
          setTokenValido(true);
        }
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
          regime_tributacao: nfseData.regime_tributacao || '6',
          optante_simples: nfseData.optante_simples ?? true,
        });
      }

      // Carregar info do certificado
      const { data: certData } = await supabase
        .from('certificados_digitais')
        .select('validade, razao_social')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (certData?.validade) {
        setCertificadoInfo({
          validade: certData.validade,
          razao_social: certData.razao_social || undefined,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const validarToken = async () => {
    if (!focusToken) {
      toast({
        title: 'Erro',
        description: 'Informe o token Focus NFe',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('focusnfe', {
        body: {
          action: 'validar_token',
          token: focusToken,
        },
      });

      if (response.data?.success) {
        setTokenValido(true);
        toast({
          title: 'Token válido',
          description: 'O token Focus NFe foi validado com sucesso.',
        });
      } else {
        setTokenValido(false);
        toast({
          title: 'Token inválido',
          description: response.data?.error || 'Não foi possível validar o token.',
          variant: 'destructive',
        });
      }
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

  const salvarConfigNfe = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('nfe_config')
        .upsert({
          company_id: currentCompany?.id,
          focus_token: focusToken,
          ambiente: configNfe.ambiente,
          serie_nfe: String(configNfe.serie_nfe),
          proximo_numero: configNfe.proximo_numero,
          inscricao_estadual: configNfe.inscricao_estadual,
          regime_tributario: configNfe.regime_tributario,
          natureza_operacao_padrao: configNfe.natureza_operacao_padrao,
          cfop_padrao: configNfe.cfop_padrao,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });

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
    if (!configNfse.inscricao_municipal) {
      toast({
        title: 'Erro',
        description: 'Inscrição Municipal é obrigatória para NFS-e',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('nfse_config')
        .upsert({
          company_id: currentCompany?.id,
          ambiente: configNfse.ambiente,
          serie_nfse: String(configNfse.serie_nfse),
          proximo_numero: configNfse.proximo_numero,
          inscricao_municipal: configNfse.inscricao_municipal,
          codigo_municipio: configNfse.codigo_municipio,
          regime_tributacao: configNfse.regime_tributacao,
          optante_simples: configNfse.optante_simples,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });

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

  const uploadCertificado = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos .pfx ou .p12 são aceitos',
        variant: 'destructive',
      });
      return;
    }

    const senha = prompt('Digite a senha do certificado:');
    if (!senha) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Upload para bucket privado
        const filePath = `${currentCompany?.id}/certificado.pfx`;
        const { error: uploadError } = await supabase.storage
          .from('inter-certs')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Salvar referência na tabela certificados_digitais
        const { error: dbError } = await supabase
          .from('certificados_digitais')
          .upsert({
            company_id: currentCompany?.id,
            file_path: filePath,
            certificado_base64: base64,
            senha: senha,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id' });

        if (dbError) throw dbError;

        toast({
          title: 'Certificado enviado',
          description: 'Certificado digital salvo com sucesso.',
        });

        carregarConfiguracoes();
      };

      reader.readAsArrayBuffer(file);
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
    <div className="space-y-6">
      <PageHeader
        title="Configuração Fiscal"
        description="Configure a emissão de NF-e e NFS-e"
      />

      <Tabs defaultValue="nfe" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nfe" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            NF-e
          </TabsTrigger>
          <TabsTrigger value="nfse" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            NFS-e
          </TabsTrigger>
          <TabsTrigger value="certificado" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Certificado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nfe">
          <Card>
            <CardHeader>
              <CardTitle>Configurações NF-e</CardTitle>
              <CardDescription>Nota Fiscal Eletrônica de Produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token Focus NFe</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={focusToken}
                      onChange={(e) => setFocusToken(e.target.value)}
                      placeholder="Token da API Focus NFe"
                    />
                    <Button variant="outline" onClick={validarToken} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                    </Button>
                  </div>
                  {tokenValido && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Token válido
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={configNfe.ambiente}
                    onValueChange={(v) => setConfigNfe({ ...configNfe, ambiente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Série NF-e</Label>
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
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input
                    value={configNfe.inscricao_estadual}
                    onChange={(e) => setConfigNfe({ ...configNfe, inscricao_estadual: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={configNfe.regime_tributario}
                    onValueChange={(v) => setConfigNfe({ ...configNfe, regime_tributario: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CFOP Padrão</Label>
                  <Input
                    value={configNfe.cfop_padrao}
                    onChange={(e) => setConfigNfe({ ...configNfe, cfop_padrao: e.target.value })}
                    placeholder="Ex: 5102"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Natureza da Operação Padrão</Label>
                <Input
                  value={configNfe.natureza_operacao_padrao}
                  onChange={(e) => setConfigNfe({ ...configNfe, natureza_operacao_padrao: e.target.value })}
                  placeholder="Ex: Venda de mercadoria"
                />
              </div>

              <Button onClick={salvarConfigNfe} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Configurações NF-e
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfse">
          <Card>
            <CardHeader>
              <CardTitle>Configurações NFS-e</CardTitle>
              <CardDescription>Nota Fiscal de Serviço Eletrônica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={configNfse.ambiente}
                    onValueChange={(v) => setConfigNfse({ ...configNfse, ambiente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Municipal *</Label>
                  <Input
                    value={configNfse.inscricao_municipal}
                    onChange={(e) => setConfigNfse({ ...configNfse, inscricao_municipal: e.target.value })}
                    placeholder="Obrigatório"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Série NFS-e</Label>
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
                  <Label>Código Município</Label>
                  <Input
                    value={configNfse.codigo_municipio}
                    onChange={(e) => setConfigNfse({ ...configNfse, codigo_municipio: e.target.value })}
                    placeholder="Ex: 5201108"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regime de Tributação</Label>
                  <Select
                    value={configNfse.regime_tributacao}
                    onValueChange={(v) => setConfigNfse({ ...configNfse, regime_tributacao: v })}
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
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={configNfse.optante_simples}
                    onCheckedChange={(v) => setConfigNfse({ ...configNfse, optante_simples: v })}
                  />
                  <Label>Optante Simples Nacional</Label>
                </div>
              </div>

              <Button onClick={salvarConfigNfse} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Configurações NFS-e
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificado">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital A1</CardTitle>
              <CardDescription>Necessário para emissão direta sem API intermediária</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {certificadoInfo ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Certificado Configurado</span>
                  </div>
                  {certificadoInfo.razao_social && (
                    <p className="text-sm text-green-700">Razão Social: {certificadoInfo.razao_social}</p>
                  )}
                  {certificadoInfo.validade && (
                    <p className="text-sm text-green-700">
                      Válido até: {new Date(certificadoInfo.validade).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Certificado não configurado</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Faça upload do certificado digital A1 (.pfx ou .p12) para emissão direta na SEFAZ.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Upload do Certificado (.pfx ou .p12)</Label>
                <Input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={uploadCertificado}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  O certificado será armazenado de forma segura e criptografada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
