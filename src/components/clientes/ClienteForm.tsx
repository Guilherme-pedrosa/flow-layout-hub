import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ShoppingCart, FileText, Loader2, Shield, Users } from "lucide-react";
import { usePessoas, PessoaInsert } from "@/hooks/usePessoas";
import { ClienteFormDadosGerais } from "./ClienteFormDadosGerais";
import { ClienteFormEndereco } from "./ClienteFormEndereco";
import { ClienteFormContatos, Contato } from "./ClienteFormContatos";
import { ClienteFormComercial } from "./ClienteFormComercial";
import { ClienteFormOperacional } from "./ClienteFormOperacional";
import { ClienteFormFiscal } from "./ClienteFormFiscal";
import { ClienteFormTecnicosIntegrados } from "./ClienteFormTecnicosIntegrados";

import { HistoricoAlteracoes } from "@/components/shared/HistoricoAlteracoes";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ClienteFormProps {
  clienteId?: string;
  onSave?: (cliente: any) => void;
}

const initialFormData: PessoaInsert = {
  tipo_pessoa: 'PJ',
  status: 'ativo',
  razao_social: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  email: '',
  telefone: '',
  situacao_cadastral: '',
  data_abertura: undefined,
  cnae_principal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  condicao_pagamento: '',
  limite_credito: undefined,
  tipo_cliente: 'avulso',
  observacoes_comerciais: '',
  responsavel_comercial: '',
  responsavel_tecnico: '',
  sla_padrao: '',
  observacoes_internas: '',
  regime_tributario: undefined,
  contribuinte_icms: false,
  retencao_impostos: false,
  observacoes_fiscais: '',
  is_cliente: true,
  is_fornecedor: false,
  is_transportadora: false,
  is_colaborador: false,
};

export function ClienteForm({ clienteId, onSave }: ClienteFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createPessoa, updatePessoa, getPessoaById, getPessoaByCpfCnpj, getContatos } = usePessoas();
  
  const [formData, setFormData] = useState<PessoaInsert>(initialFormData);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [activeTab, setActiveTab] = useState("dados-gerais");
  const [loading, setLoading] = useState(false);
  const [cnpjValidation, setCnpjValidation] = useState<{
    status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
    message?: string;
    data?: any;
  }>({ status: 'idle' });
  
  // Estado para controle de acesso de técnicos
  const [exigeIntegracao, setExigeIntegracao] = useState(false);
  const [regrasAcesso, setRegrasAcesso] = useState('');

  // Carregar dados se for edição
  useEffect(() => {
    if (clienteId) {
      loadCliente(clienteId);
    }
  }, [clienteId]);

  // Verificar duplicidade ao alterar CPF/CNPJ
  useEffect(() => {
    const checkDuplicate = async () => {
      if (formData.cpf_cnpj && formData.cpf_cnpj.length >= 11) {
        const existing = await getPessoaByCpfCnpj(formData.cpf_cnpj);
        setDuplicateWarning(existing !== null && existing.id !== clienteId);
      } else {
        setDuplicateWarning(false);
      }
    };

    const timeout = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeout);
  }, [formData.cpf_cnpj, clienteId]);

  // Validar CNPJ automaticamente na Receita Federal
  const validateCnpj = useCallback(async () => {
    const cnpj = formData.cpf_cnpj?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      setCnpjValidation({ status: 'idle' });
      return;
    }

    setCnpjValidation({ status: 'loading' });

    try {
      const { data, error } = await supabase.functions.invoke('consultar-cnpj', {
        body: { cnpj }
      });

      if (error) throw error;

      if (data.status === 'ATIVA') {
        setCnpjValidation({ 
          status: 'valid', 
          message: `CNPJ ativo desde ${data.data_abertura}`,
          data 
        });
        
        // Preencher dados automaticamente se estiver vazio
        if (!formData.razao_social && data.razao_social) {
          setFormData(prev => ({
            ...prev,
            razao_social: data.razao_social || prev.razao_social,
            nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
            situacao_cadastral: data.status || prev.situacao_cadastral,
            data_abertura: data.data_abertura || prev.data_abertura,
            cnae_principal: data.cnae_principal || prev.cnae_principal,
            logradouro: data.logradouro || prev.logradouro,
            numero: data.numero || prev.numero,
            bairro: data.bairro || prev.bairro,
            cidade: data.cidade || prev.cidade,
            estado: data.uf || prev.estado,
            cep: data.cep || prev.cep,
          }));
        }
      } else {
        setCnpjValidation({ 
          status: 'invalid', 
          message: `CNPJ com situação: ${data.status}` 
        });
      }
    } catch (error) {
      console.error('Erro ao validar CNPJ:', error);
      setCnpjValidation({ status: 'error', message: 'Erro ao consultar Receita Federal' });
    }
  }, [formData.cpf_cnpj]);

  // Validar CNPJ quando o campo muda
  useEffect(() => {
    const cnpj = formData.cpf_cnpj?.replace(/\D/g, '');
    if (formData.tipo_pessoa === 'PJ' && cnpj && cnpj.length === 14) {
      const timeout = setTimeout(validateCnpj, 1000);
      return () => clearTimeout(timeout);
    } else {
      setCnpjValidation({ status: 'idle' });
    }
  }, [formData.cpf_cnpj, formData.tipo_pessoa, validateCnpj]);

  const loadCliente = async (id: string) => {
    setLoading(true);
    try {
      const pessoa = await getPessoaById(id);
      if (pessoa) {
        setFormData({
          tipo_pessoa: pessoa.tipo_pessoa,
          status: pessoa.status,
          razao_social: pessoa.razao_social || '',
          nome_fantasia: pessoa.nome_fantasia || '',
          cpf_cnpj: pessoa.cpf_cnpj || '',
          inscricao_estadual: pessoa.inscricao_estadual || '',
          inscricao_municipal: pessoa.inscricao_municipal || '',
          email: pessoa.email || '',
          telefone: pessoa.telefone || '',
          situacao_cadastral: pessoa.situacao_cadastral || '',
          data_abertura: pessoa.data_abertura || undefined,
          cnae_principal: pessoa.cnae_principal || '',
          cep: pessoa.cep || '',
          logradouro: pessoa.logradouro || '',
          numero: pessoa.numero || '',
          complemento: pessoa.complemento || '',
          bairro: pessoa.bairro || '',
          cidade: pessoa.cidade || '',
          estado: pessoa.estado || '',
          condicao_pagamento: pessoa.condicao_pagamento || '',
          limite_credito: pessoa.limite_credito || undefined,
          tipo_cliente: pessoa.tipo_cliente || 'avulso',
          observacoes_comerciais: pessoa.observacoes_comerciais || '',
          responsavel_comercial: pessoa.responsavel_comercial || '',
          responsavel_tecnico: pessoa.responsavel_tecnico || '',
          sla_padrao: pessoa.sla_padrao || '',
          observacoes_internas: pessoa.observacoes_internas || '',
          regime_tributario: pessoa.regime_tributario || undefined,
          contribuinte_icms: pessoa.contribuinte_icms || false,
          retencao_impostos: pessoa.retencao_impostos || false,
          observacoes_fiscais: pessoa.observacoes_fiscais || '',
          is_cliente: pessoa.is_cliente,
          is_fornecedor: pessoa.is_fornecedor,
          is_transportadora: pessoa.is_transportadora,
          is_colaborador: pessoa.is_colaborador,
        });
        
        // Carregar dados de integração do cliente
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('exige_integracao, regras_acesso')
          .eq('id', id)
          .single();
        
        if (clienteData) {
          setExigeIntegracao(clienteData.exige_integracao || false);
          setRegrasAcesso(clienteData.regras_acesso || '');
        }
        
        const contatosData = await getContatos(id);
        setContatos(contatosData.map(c => ({
          id: c.id,
          nome: c.nome || '',
          cargo: c.cargo || '',
          telefone: c.telefone || '',
          email: c.email || '',
          principal: c.principal || false,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast({
        title: "Erro ao carregar cliente",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (action?: 'venda' | 'os') => {
    setLoading(true);
    try {
      let result;
      
      // Garantir que is_cliente está true ao salvar da tela de clientes
      const dataToSave = {
        ...formData,
        is_cliente: formData.is_cliente ?? true,
      };
      
      if (clienteId) {
        result = await updatePessoa.mutateAsync({ id: clienteId, data: dataToSave });
      } else {
        result = await createPessoa.mutateAsync(dataToSave);
      }

      if (result) {
        // Salvar contatos
        if (contatos.length > 0) {
          // Deletar contatos existentes
          await supabase
            .from("pessoa_contatos")
            .delete()
            .eq("pessoa_id", result.id);
          
          // Inserir novos contatos
          await supabase.from("pessoa_contatos").insert(
            contatos.map(c => ({
              pessoa_id: result.id,
              nome: c.nome || null,
              cargo: c.cargo || null,
              telefone: c.telefone || null,
              email: c.email || null,
              principal: c.principal,
            }))
          );
        }

        // Salvar configuração de integração
        await supabase
          .from('clientes')
          .update({ 
            exige_integracao: exigeIntegracao, 
            regras_acesso: regrasAcesso 
          })
          .eq('id', result.id);

        onSave?.(result);

        if (action === 'venda') {
          navigate('/checkout', { state: { clienteId: result.id } });
        } else if (action === 'os') {
          navigate('/ordens-servico', { state: { clienteId: result.id } });
        } else {
          navigate('/clientes');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Validação CNPJ Receita Federal */}
      {formData.tipo_pessoa === 'PJ' && cnpjValidation.status !== 'idle' && (
        <Alert className={
          cnpjValidation.status === 'valid' ? 'border-emerald-500/50 bg-emerald-500/10' :
          cnpjValidation.status === 'invalid' ? 'border-destructive/50 bg-destructive/10' :
          cnpjValidation.status === 'loading' ? 'border-blue-500/50 bg-blue-500/10' :
          'border-amber-500/50 bg-amber-500/10'
        }>
          <Shield className={`h-4 w-4 ${
            cnpjValidation.status === 'valid' ? 'text-emerald-600' :
            cnpjValidation.status === 'invalid' ? 'text-destructive' :
            cnpjValidation.status === 'loading' ? 'text-blue-600' :
            'text-amber-600'
          }`} />
          <AlertDescription className="flex items-center gap-2">
            {cnpjValidation.status === 'loading' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando Receita Federal...
              </>
            )}
            {cnpjValidation.status === 'valid' && (
              <>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  CNPJ Válido
                </Badge>
                {cnpjValidation.message}
              </>
            )}
            {cnpjValidation.status === 'invalid' && (
              <>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  Atenção
                </Badge>
                {cnpjValidation.message}
              </>
            )}
            {cnpjValidation.status === 'error' && (
              <>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Erro
                </Badge>
                {cnpjValidation.message}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="tecnicos" disabled={!clienteId}>
            <Users className="h-4 w-4 mr-1" />
            Técnicos
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <TabsContent value="dados-gerais" className="mt-0">
              <ClienteFormDadosGerais
                formData={formData}
                setFormData={setFormData}
                duplicateWarning={duplicateWarning}
              />
            </TabsContent>

            <TabsContent value="endereco" className="mt-0">
              <ClienteFormEndereco
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>

            <TabsContent value="contatos" className="mt-0">
              <ClienteFormContatos
                contatos={contatos}
                setContatos={setContatos}
              />
            </TabsContent>

            <TabsContent value="comercial" className="mt-0">
              <ClienteFormComercial
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>

            <TabsContent value="operacional" className="mt-0">
              <ClienteFormOperacional
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>

            <TabsContent value="fiscal" className="mt-0">
              <ClienteFormFiscal
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>


            <TabsContent value="tecnicos" className="mt-0">
              {clienteId && (
                <ClienteFormTecnicosIntegrados
                  clienteId={clienteId}
                  exigeIntegracao={exigeIntegracao}
                  regrasAcesso={regrasAcesso}
                  emailPortaria={formData.email || undefined}
                  onConfigChange={(exige, regras) => {
                    setExigeIntegracao(exige);
                    setRegrasAcesso(regras);
                  }}
                />
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => navigate('/clientes')}
          disabled={loading}
        >
          Cancelar
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleSave('venda')}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
          Salvar e Criar Venda
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleSave('os')}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Salvar e Criar OS
        </Button>
        
        <Button
          onClick={() => handleSave()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Histórico de alterações */}
      <HistoricoAlteracoes entityId={clienteId} entityType="cliente" />
    </div>
  );
}
