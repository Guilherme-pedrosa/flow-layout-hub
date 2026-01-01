import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Save, FileKey, Building2, Settings, AlertCircle, Key, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ConfiguracaoNFe() {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [certificadoInfo, setCertificadoInfo] = useState<any>(null);
  
  // Token Focus NFe (compartilhado entre NF-e e NFS-e)
  const [focusToken, setFocusToken] = useState("");
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);

  // Configurações NF-e
  const [configNfe, setConfigNfe] = useState({
    ambiente: 'homologacao',
    serie_nfe: 1,
    proximo_numero: 1,
    inscricao_estadual: '',
    regime_tributario: 'simples_nacional',
    natureza_operacao_padrao: 'Venda de mercadoria',
    cfop_padrao: '5102',
  });

  // Configurações NFS-e (Anápolis/GO)
  const [configNfse, setConfigNfse] = useState({
    ambiente: 'homologacao',
    serie_nfse: 1,
    proximo_numero: 1,
    inscricao_municipal: '',
    codigo_municipio: '5201108', // Anápolis-GO
    regime_especial_tributacao: '6', // ME/EPP Simples Nacional
    optante_simples_nacional: true,
    // Campos obrigatórios para Anápolis
    item_lista_servico: '',
    codigo_cnae: '',
    codigo_tributario_municipio: '',
    aliquota_iss: 2.0,
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
        setFocusToken(nfeData.focus_token || '');
        setConfigNfe({
          ambiente: nfeData.ambiente || 'homologacao',
          serie_nfe: parseInt(String(nfeData.serie_nfe)) || 1,
          proximo_numero: nfeData.ultimo_numero_nfe ? nfeData.ultimo_numero_nfe + 1 : 1,
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
          proximo_numero: nfseData.ultimo_numero_nfse ? nfseData.ultimo_numero_nfse + 1 : 1,
          inscricao_municipal: nfseData.inscricao_municipal || '',
          codigo_municipio: nfseData.codigo_municipio || '5201108',
          regime_especial_tributacao: String(nfseData.regime_especial_tributacao) || '6',
          optante_simples_nacional: nfseData.optante_simples_nacional ?? true,
          item_lista_servico: nfseData.item_lista_servico || '',
          codigo_cnae: nfseData.codigo_cnae || '',
          codigo_tributario_municipio: nfseData.codigo_tributario_municipio || '',
          aliquota_iss: nfseData.aliquota_iss || 2.0,
        });
      }

      // Carregar info do certificado
      const { data: certData } = await supabase
        .from('nfe_config')
        .select('certificado_validade')
        .eq('company_id', currentCompany?.id)
        .maybeSingle();

      if (certData?.certificado_validade) {
        setCertificadoInfo({
          validade: certData.certificado_validade,
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
        description: 'Informe o token da Focus NFe',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Testar token fazendo uma requisição simples
      const baseUrl = configNfe.ambiente === 'producao' 
        ? 'https://api.focusnfe.com.br' 
        : 'https://homologacao.focusnfe.com.br';
      
      const response = await fetch(`${baseUrl}/v2/nfse`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(focusToken + ':'),
        },
      });

      if (response.status === 401) {
        setTokenValido(false);
        toast({
          title: 'Token inválido',
          description: 'O token informado não é válido. Verifique no painel da Focus NFe.',
          variant: 'destructive',
        });
      } else {
        setTokenValido(true);
        toast({
          title: 'Token válido',
          description: 'Token da Focus NFe validado com sucesso!',
        });
      }
    } catch (error) {
      setTokenValido(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o token. Verifique sua conexão.',
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
          serie_nfe: configNfe.serie_nfe,
          ultimo_numero_nfe: configNfe.proximo_numero - 1,
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
          focus_token: focusToken,
          ambiente: configNfse.ambiente,
          serie_nfse: configNfse.serie_nfse,
          ultimo_numero_nfse: configNfse.proximo_numero - 1,
          inscricao_municipal: configNfse.inscricao_municipal,
          codigo_municipio: configNfse.codigo_municipio,
          regime_especial_tributacao: parseInt(configNfse.regime_especial_tributacao),
          optante_simples_nacional: configNfse.optante_simples_nacional,
          item_lista_servico: configNfse.item_lista_servico,
          codigo_cnae: configNfse.codigo_cnae,
          codigo_tributario_municipio: configNfse.codigo_tributario_municipio || configNfse.codigo_cnae,
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];

        // Salvar certificado na config de NF-e
        const { error } = await supabase
          .from('nfe_config')
          .upsert({
            company_id: currentCompany?.id,
            certificado_base64: base64,
            certificado_senha: certificado.senha,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id' });

        if (error) throw error;

        // Também salvar na config de NFS-e
        await supabase
          .from('nfse_config')
          .upsert({
            company_id: currentCompany?.id,
            certificado_base64: base64,
            certificado_senha: certificado.senha,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id' });

        toast({
          title: 'Certificado enviado',
          description: 'Certificado digital A1 configurado com sucesso.',
        });

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

      <Tabs defaultValue="api" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Focus NFe
          </TabsTrigger>
          <TabsTrigger value="certificado" className="flex items-center gap-2">
            <FileKey className="h-4 w-4" />
            Certificado
          </TabsTrigger>
          <TabsTrigger value="nfe" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            NF-e
          </TabsTrigger>
          <TabsTrigger value="nfse" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            NFS-e
          </TabsTrigger>
        </TabsList>

        {/* Tab API Focus NFe */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Integração Focus NFe</CardTitle>
              <CardDescription>
                Configure o token de acesso à API da Focus NFe para emissão de notas fiscais.
                Obtenha seu token em <a href="https://focusnfe.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">focusnfe.com.br</a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A Focus NFe é uma API que facilita a emissão de NF-e e NFS-e, fazendo toda a comunicação com a SEFAZ e prefeituras.
                  O mesmo token funciona para NF-e e NFS-e.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="focusToken">Token de Acesso</Label>
                  <div className="flex gap-2">
                    <Input
                      id="focusToken"
                      type="password"
                      value={focusToken}
                      onChange={(e) => setFocusToken(e.target.value)}
                      placeholder="Cole aqui o token da Focus NFe"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={validarToken} disabled={loading}>
                      Validar
                    </Button>
                  </div>
                  {tokenValido === true && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Token válido
                    </p>
                  )}
                  {tokenValido === false && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Token inválido
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Ambiente Padrão</Label>
                  <Select
                    value={configNfe.ambiente}
                    onValueChange={(value) => setConfigNfe({ ...configNfe, ambiente: value })}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Use homologação para testes. Mude para produção apenas quando estiver pronto.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                    <strong>Certificado configurado</strong><br />
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
                Configure a emissão de Nota Fiscal Eletrônica de produtos (SEFAZ-GO).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input
                    value={configNfe.inscricao_estadual}
                    onChange={(e) => setConfigNfe({ ...configNfe, inscricao_estadual: e.target.value })}
                    placeholder="Número da IE"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={configNfe.regime_tributario}
                    onValueChange={(value) => setConfigNfe({ ...configNfe, regime_tributario: value })}
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

                <div className="space-y-2">
                  <Label>Natureza da Operação Padrão</Label>
                  <Input
                    value={configNfe.natureza_operacao_padrao}
                    onChange={(e) => setConfigNfe({ ...configNfe, natureza_operacao_padrao: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CFOP Padrão</Label>
                  <Input
                    value={configNfe.cfop_padrao}
                    onChange={(e) => setConfigNfe({ ...configNfe, cfop_padrao: e.target.value })}
                    placeholder="5102"
                  />
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
              <CardTitle>Configurações de NFS-e (Anápolis/GO)</CardTitle>
              <CardDescription>
                Configure a emissão de Nota Fiscal de Serviço Eletrônica para a Prefeitura de Anápolis.
                Padrão ABRASF 2.04 via IssNet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Para emitir NFS-e em Anápolis, você precisa solicitar liberação de webservice em <strong>notaeletronica@anapolis.go.gov.br</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="5201108"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Anápolis/GO</p>
                </div>

                <div className="space-y-2">
                  <Label>Item Lista de Serviço (LC 116) <span className="text-red-500">*</span></Label>
                  <Input
                    value={configNfse.item_lista_servico}
                    onChange={(e) => setConfigNfse({ ...configNfse, item_lista_servico: e.target.value })}
                    placeholder="Ex: 7.13, 17.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Código do serviço conforme Lei Complementar 116/2003
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Código CNAE <span className="text-red-500">*</span></Label>
                  <Input
                    value={configNfse.codigo_cnae}
                    onChange={(e) => {
                      const cnae = e.target.value;
                      setConfigNfse({ 
                        ...configNfse, 
                        codigo_cnae: cnae,
                        codigo_tributario_municipio: cnae // Em Anápolis, é o mesmo
                      });
                    }}
                    placeholder="Ex: 8129000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Em Anápolis, o código tributário é igual ao CNAE
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Alíquota ISS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={configNfse.aliquota_iss}
                    onChange={(e) => setConfigNfse({ ...configNfse, aliquota_iss: parseFloat(e.target.value) || 2.0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regime Especial de Tributação</Label>
                  <Select
                    value={configNfse.regime_especial_tributacao}
                    onValueChange={(value) => setConfigNfse({ ...configNfse, regime_especial_tributacao: value })}
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

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="optante_simples"
                    checked={configNfse.optante_simples_nacional}
                    onCheckedChange={(checked) => setConfigNfse({ ...configNfse, optante_simples_nacional: checked })}
                  />
                  <Label htmlFor="optante_simples">Optante pelo Simples Nacional</Label>
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
