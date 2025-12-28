import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ShoppingCart, FileText, Loader2 } from "lucide-react";
import { useClientes, ClienteInsert } from "@/hooks/useClientes";
import { ClienteFormDadosGerais } from "./ClienteFormDadosGerais";
import { ClienteFormEndereco } from "./ClienteFormEndereco";
import { ClienteFormContatos, Contato } from "./ClienteFormContatos";
import { ClienteFormComercial } from "./ClienteFormComercial";
import { ClienteFormOperacional } from "./ClienteFormOperacional";
import { ClienteFormFiscal } from "./ClienteFormFiscal";
import { useToast } from "@/hooks/use-toast";

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
    </div>
  );
}
