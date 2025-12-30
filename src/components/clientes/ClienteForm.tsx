import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ShoppingCart, FileText, Loader2, Shield } from "lucide-react";
import { useClientes, ClienteInsert } from "@/hooks/useClientes";
import { ClienteFormDadosGerais } from "./ClienteFormDadosGerais";
import { ClienteFormEndereco } from "./ClienteFormEndereco";
import { ClienteFormContatos, Contato } from "./ClienteFormContatos";
import { ClienteFormComercial } from "./ClienteFormComercial";
import { ClienteFormOperacional } from "./ClienteFormOperacional";
import { ClienteFormFiscal } from "./ClienteFormFiscal";
import { HistoricoAlteracoes } from "@/components/shared/HistoricoAlteracoes";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ClienteFormProps {
  clienteId?: string;
  onSave?: (cliente: any) => void;
}

const initialFormData: ClienteInsert = {
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
  data_abertura: null,
  cnae_principal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  condicao_pagamento: '',
  limite_credito: null,
  tipo_cliente: 'avulso',
  observacoes_comerciais: '',
  responsavel_comercial: '',
  responsavel_tecnico: '',
  sla_padrao: '',
  observacoes_internas: '',
  regime_tributario: null,
  contribuinte_icms: false,
  retencao_impostos: false,
  observacoes_fiscais: '',
};

export function ClienteForm({ clienteId, onSave }: ClienteFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, fetchCliente, fetchContatos, saveCliente, updateCliente, checkDuplicateCpfCnpj } = useClientes();
  
  const [formData, setFormData] = useState<ClienteInsert>(initialFormData);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [activeTab, setActiveTab] = useState("dados-gerais");
  const [cnpjValidation, setCnpjValidation] = useState<{
    status: 'idle' | 'loading' | 'valid' | 'invalid' | 'error';
    message?: string;
    data?: any;
  }>({ status: 'idle' });

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
        const isDuplicate = await checkDuplicateCpfCnpj(formData.cpf_cnpj, clienteId);
        setDuplicateWarning(isDuplicate);
      } else {
        setDuplicateWarning(false);
      }
    };

    const timeout = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeout);
  }, [formData.cpf_cnpj]);

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
    const cliente = await fetchCliente(id);
    if (cliente) {
      setFormData(cliente);
      const contatosData = await fetchContatos(id);
      setContatos(contatosData.map(c => ({
        id: c.id,
        nome: c.nome || '',
        cargo: c.cargo || '',
        telefone: c.telefone || '',
        email: c.email || '',
        principal: c.principal || false,
      })));
    }
  };

  const handleSave = async (action?: 'venda' | 'os') => {
    const contatosToSave = contatos.map(c => ({
      nome: c.nome || null,
      cargo: c.cargo || null,
      telefone: c.telefone || null,
      email: c.email || null,
      principal: c.principal,
      cliente_id: clienteId || '', // Será preenchido após salvar
    }));

    let result;
    
    if (clienteId) {
      result = await updateCliente(clienteId, formData, contatosToSave);
    } else {
      result = await saveCliente(formData, contatosToSave);
    }

    if (result) {
      onSave?.(result);

      if (action === 'venda') {
        navigate('/checkout', { state: { clienteId: result.id } });
      } else if (action === 'os') {
        navigate('/ordens-servico', { state: { clienteId: result.id } });
      } else {
        navigate('/clientes');
      }
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
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
