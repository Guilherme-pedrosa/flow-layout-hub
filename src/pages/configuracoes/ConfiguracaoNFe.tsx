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
import { Settings, FileText, CheckCircle, XCircle, Loader2, Key, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared';

export default function ConfiguracaoNFe() {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  
  const [configNfe, setConfigNfe] = useState({
    ambiente: 'homologacao',
    serie_nfe: 1,
    proximo_numero: 1,
    inscricao_estadual: '',
    regime_tributario: 'simples_nacional',
    natureza_operacao_padrao: 'Venda de mercadoria',
    cfop_padrao: '5102',
    csc_id: '',
    csc_token: '',
  });

  const [configNfse, setConfigNfse] = useState({
    ambiente: 'homologacao',
    serie_nfse: 1,
    proximo_numero: 1,
    inscricao_municipal: '',
    codigo_municipio: '5201108',
    regime_tributacao: '6',
    optante_simples: true,
    cnae: '',
    item_lista_servico: '',
    aliquota_iss: 5,
  });

  const [certificadoInfo, setCertificadoInfo] = useState<{
    validade?: string;
    razao_social?: string;
    configurado: boolean;
  }>({ configurado: false });

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
        setConfigNfe({
          ambiente: nfeData.ambiente || 'homologacao',
          serie_nfe: parseInt(String(nfeData.serie_nfe)) || 1,
          proximo_numero: nfeData.proximo_numero || 1,
          inscricao_estadual: nfeData.inscricao_estadual || '',
          regime_tributario: nfeData.regime_tributario || 'simples_nacional',
          natureza_operacao_padrao: nfeData.natureza_operacao_padrao || 'Venda de mercadoria',
          cfop_padrao: nfeData.cfop_padrao || '5102',
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
          regime_tributacao: nfseData.regime_tributacao || '6',
          optante_simples: nfseData.optante_simples ?? true,
          cnae: (nfseData as any).cnae || '',
          item_lista_servico: (nfseData as any).item_lista_servico || '',
          aliquota_iss: (nfseData as any).aliquota_iss || 5,
        });
      }

      // Carregar info do certificado
      const { data: certData } = await supabase
        .from('certificados_digitais')
        .select('validade, razao_social')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (certData) {
        setCertificadoInfo({
          validade: certData.validade || undefined,
          razao_social: certData.razao_social || undefined,
          configurado: true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const salvarConfigNfe = async () => {
    if (!configNfe.inscricao_estadual) {
      toast({
        title: 'Erro',
        description: 'Inscrição Estadual é obrigatória para NF-e',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('nfe_config')
        .upsert({
          company_id: currentCompany?.id,
          ambiente: configNfe.ambiente,
          serie_nfe: String(configNfe.serie_nfe),
          proximo_numero: configNfe.proximo_numero,
          inscricao_estadual: configNfe.inscricao_estadual,
          regime_tributario: configNfe.regime_tributario,
          natureza_operacao_padrao: configNfe.natureza_operacao_padrao,
          cfop_padrao: configNfe.cfop_padrao,
          csc_id: configNfe.csc_id,
          csc_token: configNfe.csc_token,
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
          cnae: configNfse.cnae,
          item_lista_servico: configNfse.item_lista_servico,
          aliquota_iss: configNfse.aliquota_iss,
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
        description="Configure a emissão de NF-e e NFS-e - Comunicação direta com SEFAZ e Prefeitura"
      />

      {/* Aviso sobre certificado */}
      {!certificadoInfo.configurado && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Certificado Digital não configurado</p>
            <p className="text-sm text-yellow-700">
              Para emitir NF-e e NFS-e, você precisa fazer upload do certificado digital A1 na aba "Certificado".
            </p>
          </div>
        </div>
      )}

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
              <CardDescription>Nota Fiscal Eletrônica de Produto - Comunicação direta com SEFAZ-GO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual *</Label>
                  <Input
                    value={configNfe.inscricao_estadual}
                    onChange={(e) => setConfigNfe({ ...configNfe, inscricao_estadual: e.target.value })}
                    placeholder="Obrigatório"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CFOP Padrão</Label>
                  <Input
                    value={configNfe.cfop_padrao}
                    onChange={(e) => setConfigNfe({ ...configNfe, cfop_padrao: e.target.value })}
                    placeholder="Ex: 5102"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Natureza da Operação Padrão</Label>
                  <Input
                    value={configNfe.natureza_operacao_padrao}
                    onChange={(e) => setConfigNfe({ ...configNfe, natureza_operacao_padrao: e.target.value })}
                    placeholder="Ex: Venda de mercadoria"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CSC ID (NFC-e)</Label>
                  <Input
                    value={configNfe.csc_id}
                    onChange={(e) => setConfigNfe({ ...configNfe, csc_id: e.target.value })}
                    placeholder="Código de Segurança do Contribuinte"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CSC Token (NFC-e)</Label>
                  <Input
                    type="password"
                    value={configNfe.csc_token}
                    onChange={(e) => setConfigNfe({ ...configNfe, csc_token: e.target.value })}
                    placeholder="Token do CSC"
                  />
                </div>
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
              <CardDescription>Nota Fiscal de Serviço Eletrônica - Prefeitura de Anápolis/GO (IssNet)</CardDescription>
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
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
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
                    placeholder="5201108 (Anápolis)"
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CNAE Principal</Label>
                  <Input
                    value={configNfse.cnae}
                    onChange={(e) => setConfigNfse({ ...configNfse, cnae: e.target.value })}
                    placeholder="Ex: 4930202"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item Lista Serviço</Label>
                  <Input
                    value={configNfse.item_lista_servico}
                    onChange={(e) => setConfigNfse({ ...configNfse, item_lista_servico: e.target.value })}
                    placeholder="Ex: 16.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alíquota ISS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={configNfse.aliquota_iss}
                    onChange={(e) => setConfigNfse({ ...configNfse, aliquota_iss: parseFloat(e.target.value) || 5 })}
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
              <CardDescription>Necessário para emissão direta na SEFAZ e Prefeitura (sem API intermediária)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {certificadoInfo.configurado ? (
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
                    Faça upload do certificado digital A1 (.pfx ou .p12) para emissão direta na SEFAZ e Prefeitura.
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
                  O certificado será armazenado de forma segura e criptografada. A senha será solicitada no momento do upload.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Emissão Direta:</strong> O WAI ERP comunica diretamente com a SEFAZ-GO (NF-e) e Prefeitura de Anápolis/IssNet (NFS-e), 
                  sem passar por APIs intermediárias como Focus NFe ou similares.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
