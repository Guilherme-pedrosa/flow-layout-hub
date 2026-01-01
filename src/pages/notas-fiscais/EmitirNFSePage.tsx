import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Plus, Trash2, Calculator, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNFSeEmissor } from "@/hooks/useNFSeEmissor";

type Servico = {
  id: string;
  descricao: string;
  codigo_servico: string;
  cnae: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  aliquota_iss: number;
  valor_iss: number;
  iss_retido: boolean;
};

type FormData = {
  // Dados Gerais
  numero: number;
  data_emissao: string;
  data_competencia: string;
  natureza_operacao: string;
  regime_tributacao: string;
  optante_simples: boolean;
  incentivador_cultural: boolean;
  
  // Tomador
  tomador_id: string;
  tomador_tipo_documento: "cnpj" | "cpf" | "estrangeiro";
  tomador_documento: string;
  tomador_razao_social: string;
  tomador_im: string;
  tomador_cep: string;
  tomador_logradouro: string;
  tomador_numero: string;
  tomador_complemento: string;
  tomador_bairro: string;
  tomador_cidade: string;
  tomador_uf: string;
  tomador_pais: string;
  tomador_telefone: string;
  tomador_email: string;
  
  // Discriminação
  discriminacao: string;
  
  // Valores
  valor_deducoes: number;
  desconto_incondicionado: number;
  desconto_condicionado: number;
  outras_retencoes: number;
  
  // Retenções
  valor_pis: number;
  valor_cofins: number;
  valor_inss: number;
  valor_ir: number;
  valor_csll: number;
  
  // Informações Adicionais
  info_complementares: string;
};

const initialFormData: FormData = {
  numero: 0,
  data_emissao: format(new Date(), "yyyy-MM-dd"),
  data_competencia: format(new Date(), "yyyy-MM"),
  natureza_operacao: "1",
  regime_tributacao: "1",
  optante_simples: false,
  incentivador_cultural: false,
  
  tomador_id: "",
  tomador_tipo_documento: "cnpj",
  tomador_documento: "",
  tomador_razao_social: "",
  tomador_im: "",
  tomador_cep: "",
  tomador_logradouro: "",
  tomador_numero: "",
  tomador_complemento: "",
  tomador_bairro: "",
  tomador_cidade: "",
  tomador_uf: "",
  tomador_pais: "Brasil",
  tomador_telefone: "",
  tomador_email: "",
  
  discriminacao: "",
  
  valor_deducoes: 0,
  desconto_incondicionado: 0,
  desconto_condicionado: 0,
  outras_retencoes: 0,
  
  valor_pis: 0,
  valor_cofins: 0,
  valor_inss: 0,
  valor_ir: 0,
  valor_csll: 0,
  
  info_complementares: "",
};

export default function EmitirNFSePage() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { emitirNFSe, isLoading: isEmitting } = useNFSeEmissor();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Buscar próximo número de nota
  const { data: proximoNumero } = useQuery({
    queryKey: ["proximo-numero-nfse", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return 1;
      const { data } = await supabase
        .from("notas_fiscais_servico")
        .select("numero")
        .eq("company_id", currentCompany.id)
        .order("numero", { ascending: false })
        .limit(1)
        .single();
      return (data?.numero || 0) + 1;
    },
    enabled: !!currentCompany?.id,
  });

  useEffect(() => {
    if (proximoNumero) {
      setFormData(prev => ({ ...prev, numero: proximoNumero }));
    }
  }, [proximoNumero]);

  // Buscar clientes
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("pessoas")
        .select("id, razao_social, cpf_cnpj, tipo_pessoa, im, endereco, numero, bairro, cidade, uf, cep, telefone, email")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar serviços cadastrados
  const { data: servicosCadastrados } = useQuery({
    queryKey: ["servicos", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("services")
        .select("id, name, codigo_servico, cnae, sale_price, aliquota_iss")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleTomadorChange = (pessoaId: string) => {
    const pessoa = pessoas?.find(p => p.id === pessoaId);
    if (pessoa) {
      setFormData(prev => ({
        ...prev,
        tomador_id: pessoa.id,
        tomador_tipo_documento: pessoa.cpf_cnpj?.length === 14 ? "cnpj" : "cpf",
        tomador_documento: pessoa.cpf_cnpj || "",
        tomador_razao_social: pessoa.razao_social || "",
        tomador_im: pessoa.im || "",
        tomador_cep: pessoa.cep || "",
        tomador_logradouro: pessoa.endereco || "",
        tomador_numero: pessoa.numero || "",
        tomador_bairro: pessoa.bairro || "",
        tomador_cidade: pessoa.cidade || "",
        tomador_uf: pessoa.uf || "",
        tomador_telefone: pessoa.telefone || "",
        tomador_email: pessoa.email || "",
      }));
    }
  };

  const handleAddServico = () => {
    setServicos(prev => [...prev, {
      id: crypto.randomUUID(),
      descricao: "",
      codigo_servico: "",
      cnae: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      aliquota_iss: 5,
      valor_iss: 0,
      iss_retido: false,
    }]);
  };

  const handleRemoveServico = (id: string) => {
    setServicos(prev => prev.filter(s => s.id !== id));
  };

  const handleServicoChange = (id: string, field: keyof Servico, value: any) => {
    setServicos(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if (field === "quantidade" || field === "valor_unitario") {
        updated.valor_total = updated.quantidade * updated.valor_unitario;
        updated.valor_iss = updated.valor_total * (updated.aliquota_iss / 100);
      }
      if (field === "aliquota_iss") {
        updated.valor_iss = updated.valor_total * (updated.aliquota_iss / 100);
      }
      return updated;
    }));
  };

  const calcularTotais = () => {
    const totalServicos = servicos.reduce((acc, s) => acc + s.valor_total, 0);
    const totalISS = servicos.reduce((acc, s) => acc + s.valor_iss, 0);
    const totalISSRetido = servicos.filter(s => s.iss_retido).reduce((acc, s) => acc + s.valor_iss, 0);
    
    const baseCalculo = totalServicos - formData.valor_deducoes - formData.desconto_incondicionado;
    const totalRetencoes = formData.valor_pis + formData.valor_cofins + formData.valor_inss + formData.valor_ir + formData.valor_csll + totalISSRetido + formData.outras_retencoes;
    const valorLiquido = totalServicos - formData.desconto_incondicionado - totalRetencoes;
    
    return {
      totalServicos,
      baseCalculo,
      totalISS,
      totalISSRetido,
      totalRetencoes,
      valorLiquido,
    };
  };

  const totais = calcularTotais();

  const handleSalvar = async (emitir: boolean = false) => {
    try {
      // Validações básicas
      if (!formData.tomador_documento) {
        toast.error("Informe o tomador");
        return;
      }
      if (servicos.length === 0) {
        toast.error("Adicione pelo menos um serviço");
        return;
      }
      if (!formData.discriminacao) {
        toast.error("Informe a discriminação dos serviços");
        return;
      }

      // Salvar no banco
      const { data: nota, error } = await supabase
        .from("notas_fiscais_servico")
        .insert({
          company_id: currentCompany?.id,
          numero: formData.numero,
          data_emissao: formData.data_emissao,
          tomador_nome: formData.tomador_razao_social,
          tomador_documento: formData.tomador_documento,
          discriminacao: formData.discriminacao,
          valor_servicos: totais.totalServicos,
          valor_iss: totais.totalISS,
          situacao: "em_aberto",
          dados_json: {
            formData,
            servicos,
            totais,
          },
        })
        .select()
        .single();

      if (error) throw error;

      if (emitir) {
        // Chamar API de emissão
        toast.info("Emitindo NFS-e...");
        // await emitirNFSe(nota.id);
      }

      toast.success(emitir ? "NFS-e emitida com sucesso!" : "NFS-e salva com sucesso!");
      navigate("/notas-fiscais-servico");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <Link to="/notas-fiscais-servico" className="hover:text-foreground">NFS-e</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Adicionar</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Adicionar NFS-e</h1>

      {/* Dados Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Número (RPS)</Label>
            <Input
              value={formData.numero}
              onChange={(e) => setFormData(prev => ({ ...prev, numero: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Data de emissão</Label>
            <Input
              type="date"
              value={formData.data_emissao}
              onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Competência</Label>
            <Input
              type="month"
              value={formData.data_competencia}
              onChange={(e) => setFormData(prev => ({ ...prev, data_competencia: e.target.value }))}
            />
          </div>
          <div>
            <Label>Natureza da operação</Label>
            <Select
              value={formData.natureza_operacao}
              onValueChange={(value) => setFormData(prev => ({ ...prev, natureza_operacao: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Tributação no município</SelectItem>
                <SelectItem value="2">Tributação fora do município</SelectItem>
                <SelectItem value="3">Isenção</SelectItem>
                <SelectItem value="4">Imune</SelectItem>
                <SelectItem value="5">Exigibilidade suspensa por decisão judicial</SelectItem>
                <SelectItem value="6">Exigibilidade suspensa por procedimento administrativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Regime de tributação</Label>
            <Select
              value={formData.regime_tributacao}
              onValueChange={(value) => setFormData(prev => ({ ...prev, regime_tributacao: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Microempresa Municipal</SelectItem>
                <SelectItem value="2">Estimativa</SelectItem>
                <SelectItem value="3">Sociedade de Profissionais</SelectItem>
                <SelectItem value="4">Cooperativa</SelectItem>
                <SelectItem value="5">MEI - Simples Nacional</SelectItem>
                <SelectItem value="6">ME/EPP - Simples Nacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="optante_simples"
              checked={formData.optante_simples}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, optante_simples: !!checked }))}
            />
            <label htmlFor="optante_simples" className="text-sm">Optante pelo Simples Nacional</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incentivador_cultural"
              checked={formData.incentivador_cultural}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, incentivador_cultural: !!checked }))}
            />
            <label htmlFor="incentivador_cultural" className="text-sm">Incentivador cultural</label>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Tomador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do tomador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cliente</Label>
              <SearchableSelect
                options={(pessoas || []).map(p => ({
                  value: p.id,
                  label: p.razao_social || "",
                  sublabel: p.cpf_cnpj || "",
                }))}
                value={formData.tomador_id}
                onValueChange={handleTomadorChange}
                placeholder="Digite para buscar"
              />
            </div>
            <div>
              <Label>Tipo de documento</Label>
              <Select
                value={formData.tomador_tipo_documento}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, tomador_tipo_documento: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CNPJ/CPF <span className="text-red-500">*</span></Label>
              <Input
                value={formData.tomador_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_documento: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Razão social <span className="text-red-500">*</span></Label>
              <Input
                value={formData.tomador_razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_razao_social: e.target.value }))}
              />
            </div>
            <div>
              <Label>Inscrição municipal</Label>
              <Input
                value={formData.tomador_im}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_im: e.target.value }))}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.tomador_email}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.tomador_cep}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_cep: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Logradouro</Label>
              <Input
                value={formData.tomador_logradouro}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_logradouro: e.target.value }))}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={formData.tomador_numero}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_numero: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Bairro</Label>
              <Input
                value={formData.tomador_bairro}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_bairro: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={formData.tomador_cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_cidade: e.target.value }))}
              />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={formData.tomador_uf}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_uf: e.target.value }))}
                maxLength={2}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.tomador_telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, tomador_telefone: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Serviços</CardTitle>
          <Button onClick={handleAddServico} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar serviço
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Alíq. ISS</TableHead>
                <TableHead className="text-right">ISS</TableHead>
                <TableHead>Retido</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum serviço adicionado
                  </TableCell>
                </TableRow>
              ) : (
                servicos.map((servico, index) => (
                  <TableRow key={servico.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        placeholder="Descrição do serviço"
                        value={servico.descricao}
                        onChange={(e) => handleServicoChange(servico.id, "descricao", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Código"
                        value={servico.codigo_servico}
                        onChange={(e) => handleServicoChange(servico.id, "codigo_servico", e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={servico.quantidade}
                        onChange={(e) => handleServicoChange(servico.id, "quantidade", parseFloat(e.target.value) || 0)}
                        className="w-20 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={servico.valor_unitario}
                        onChange={(e) => handleServicoChange(servico.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={servico.aliquota_iss}
                        onChange={(e) => handleServicoChange(servico.id, "aliquota_iss", parseFloat(e.target.value) || 0)}
                        className="w-20 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(servico.valor_iss)}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={servico.iss_retido}
                        onCheckedChange={(checked) => handleServicoChange(servico.id, "iss_retido", !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveServico(servico.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discriminação dos Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discriminação dos serviços <span className="text-red-500">*</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva detalhadamente os serviços prestados..."
            value={formData.discriminacao}
            onChange={(e) => setFormData(prev => ({ ...prev, discriminacao: e.target.value }))}
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Valores e Retenções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valores e retenções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Valor das deduções</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_deducoes}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_deducoes: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Desconto incondicionado</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.desconto_incondicionado}
                onChange={(e) => setFormData(prev => ({ ...prev, desconto_incondicionado: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Desconto condicionado</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.desconto_condicionado}
                onChange={(e) => setFormData(prev => ({ ...prev, desconto_condicionado: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Outras retenções</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.outras_retencoes}
                onChange={(e) => setFormData(prev => ({ ...prev, outras_retencoes: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>PIS</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_pis}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_pis: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>COFINS</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_cofins}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_cofins: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>INSS</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_inss}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_inss: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>IR</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_ir}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_ir: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>CSLL</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_csll}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_csll: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Totais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Total dos serviços</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.totalServicos)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Base de cálculo</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.baseCalculo)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Total ISS</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.totalISS)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>ISS Retido</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.totalISSRetido)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Total retenções</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.totalRetencoes)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label className="text-lg font-bold">Valor líquido</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.valorLiquido)}
                readOnly
                className="bg-green-50 text-lg font-bold text-green-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Informações complementares..."
            value={formData.info_complementares}
            onChange={(e) => setFormData(prev => ({ ...prev, info_complementares: e.target.value }))}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex items-center gap-4 sticky bottom-0 bg-background py-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Cadastrar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleSalvar(false)}>
              Salvar como rascunho
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSalvar(true)}>
              Salvar e emitir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="destructive" asChild>
          <Link to="/notas-fiscais-servico">Cancelar</Link>
        </Button>
      </div>
    </div>
  );
}
