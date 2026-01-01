import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Plus, Trash2, MoreHorizontal, Calculator, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNFeEmissor } from "@/hooks/useNFeEmissor";

type Produto = {
  id: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  icms_cst: string;
  icms_aliquota: number;
  icms_valor: number;
  pis_cst: string;
  pis_aliquota: number;
  pis_valor: number;
  cofins_cst: string;
  cofins_aliquota: number;
  cofins_valor: number;
};

type FormData = {
  // Dados Gerais
  numero: number;
  serie: number;
  natureza_operacao: string;
  tipo: "entrada" | "saida";
  consumidor_final: boolean;
  data_emissao: string;
  hora_emissao: string;
  data_saida_entrada: string;
  hora_saida_entrada: string;
  finalidade: "normal" | "complementar" | "ajuste" | "devolucao";
  forma_emissao: "normal" | "contingencia";
  destino_operacao: "interna" | "interestadual" | "exterior";
  tipo_atendimento: "nao_se_aplica" | "presencial" | "internet" | "teleatendimento" | "outros";
  nf_referenciada: string;
  
  // Destinatário
  destinatario_id: string;
  destinatario_tipo_documento: "cnpj" | "cpf" | "estrangeiro";
  destinatario_documento: string;
  destinatario_razao_social: string;
  destinatario_tipo_contribuinte: "contribuinte" | "isento" | "nao_contribuinte";
  destinatario_ie: string;
  destinatario_suframa: string;
  destinatario_im: string;
  destinatario_cep: string;
  destinatario_logradouro: string;
  destinatario_numero: string;
  destinatario_complemento: string;
  destinatario_bairro: string;
  destinatario_cidade: string;
  destinatario_uf: string;
  destinatario_pais: string;
  destinatario_telefone: string;
  destinatario_email: string;
  
  // Transporte
  modalidade_frete: "cif" | "fob" | "terceiros" | "proprio_remetente" | "proprio_destinatario" | "sem_frete";
  transportadora_id: string;
  transportadora_documento: string;
  transportadora_razao_social: string;
  transportadora_ie: string;
  transportadora_endereco: string;
  transportadora_cidade: string;
  transportadora_uf: string;
  veiculo_placa: string;
  veiculo_rntc: string;
  
  // Volumes
  volumes_quantidade: number;
  volumes_peso_liquido: number;
  volumes_peso_bruto: number;
  volumes_especie: string;
  volumes_marca: string;
  volumes_numeracao: string;
  
  // Informações Adicionais
  info_complementares: string;
  info_fisco: string;
};

const initialFormData: FormData = {
  numero: 0,
  serie: 1,
  natureza_operacao: "",
  tipo: "saida",
  consumidor_final: false,
  data_emissao: format(new Date(), "yyyy-MM-dd"),
  hora_emissao: format(new Date(), "HH:mm"),
  data_saida_entrada: format(new Date(), "yyyy-MM-dd"),
  hora_saida_entrada: format(new Date(), "HH:mm"),
  finalidade: "normal",
  forma_emissao: "normal",
  destino_operacao: "interna",
  tipo_atendimento: "presencial",
  nf_referenciada: "",
  
  destinatario_id: "",
  destinatario_tipo_documento: "cnpj",
  destinatario_documento: "",
  destinatario_razao_social: "",
  destinatario_tipo_contribuinte: "contribuinte",
  destinatario_ie: "",
  destinatario_suframa: "",
  destinatario_im: "",
  destinatario_cep: "",
  destinatario_logradouro: "",
  destinatario_numero: "",
  destinatario_complemento: "",
  destinatario_bairro: "",
  destinatario_cidade: "",
  destinatario_uf: "",
  destinatario_pais: "Brasil",
  destinatario_telefone: "",
  destinatario_email: "",
  
  modalidade_frete: "cif",
  transportadora_id: "",
  transportadora_documento: "",
  transportadora_razao_social: "",
  transportadora_ie: "",
  transportadora_endereco: "",
  transportadora_cidade: "",
  transportadora_uf: "",
  veiculo_placa: "",
  veiculo_rntc: "",
  
  volumes_quantidade: 1,
  volumes_peso_liquido: 0,
  volumes_peso_bruto: 0,
  volumes_especie: "",
  volumes_marca: "",
  volumes_numeracao: "",
  
  info_complementares: "",
  info_fisco: "",
};

export default function EmitirNFePage() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { emitirNFe, isLoading: isEmitting } = useNFeEmissor();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [mostrarEnderecoEntrega, setMostrarEnderecoEntrega] = useState(false);
  const [mostrarEnderecoRetirada, setMostrarEnderecoRetirada] = useState(false);
  const [mostrarRetencaoICMS, setMostrarRetencaoICMS] = useState(false);
  const [mostrarFormaPagamento, setMostrarFormaPagamento] = useState(false);
  const [mostrarRetencaoImpostos, setMostrarRetencaoImpostos] = useState(false);
  const [mostrarLocalEmbarque, setMostrarLocalEmbarque] = useState(false);

  // Buscar próximo número de nota
  const { data: proximoNumero } = useQuery({
    queryKey: ["proximo-numero-nfe", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return 1;
      const { data } = await supabase
        .from("notas_fiscais")
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

  // Buscar clientes/fornecedores
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("pessoas")
        .select("id, razao_social, cpf_cnpj, tipo_pessoa, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar produtos
  const { data: produtosCadastrados } = useQuery({
    queryKey: ["produtos", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, ncm, cfop, sale_price")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleDestinatarioChange = (pessoaId: string) => {
    const pessoa = pessoas?.find(p => p.id === pessoaId);
    if (pessoa) {
      setFormData(prev => ({
        ...prev,
        destinatario_id: pessoa.id,
        destinatario_tipo_documento: pessoa.cpf_cnpj?.length === 14 ? "cnpj" : "cpf",
        destinatario_documento: pessoa.cpf_cnpj || "",
        destinatario_razao_social: pessoa.razao_social || "",
        destinatario_ie: pessoa.ie || "",
        destinatario_cep: pessoa.cep || "",
        destinatario_logradouro: pessoa.endereco || "",
        destinatario_numero: pessoa.numero || "",
        destinatario_bairro: pessoa.bairro || "",
        destinatario_cidade: pessoa.cidade || "",
        destinatario_uf: pessoa.uf || "",
        destinatario_telefone: pessoa.telefone || "",
        destinatario_email: pessoa.email || "",
      }));
    }
  };

  const handleAddProduto = () => {
    setProdutos(prev => [...prev, {
      id: crypto.randomUUID(),
      descricao: "",
      ncm: "",
      cfop: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      icms_cst: "00",
      icms_aliquota: 0,
      icms_valor: 0,
      pis_cst: "01",
      pis_aliquota: 0,
      pis_valor: 0,
      cofins_cst: "01",
      cofins_aliquota: 0,
      cofins_valor: 0,
    }]);
  };

  const handleRemoveProduto = (id: string) => {
    setProdutos(prev => prev.filter(p => p.id !== id));
  };

  const handleProdutoChange = (id: string, field: keyof Produto, value: any) => {
    setProdutos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (field === "quantidade" || field === "valor_unitario") {
        updated.valor_total = updated.quantidade * updated.valor_unitario;
      }
      return updated;
    }));
  };

  const calcularTotais = () => {
    const totalProdutos = produtos.reduce((acc, p) => acc + p.valor_total, 0);
    const totalICMS = produtos.reduce((acc, p) => acc + p.icms_valor, 0);
    const totalPIS = produtos.reduce((acc, p) => acc + p.pis_valor, 0);
    const totalCOFINS = produtos.reduce((acc, p) => acc + p.cofins_valor, 0);
    
    return {
      totalProdutos,
      totalICMS,
      totalPIS,
      totalCOFINS,
      totalNF: totalProdutos,
    };
  };

  const totais = calcularTotais();

  const handleSalvar = async (emitir: boolean = false) => {
    try {
      // Validações básicas
      if (!formData.destinatario_documento) {
        toast.error("Informe o destinatário");
        return;
      }
      if (produtos.length === 0) {
        toast.error("Adicione pelo menos um produto");
        return;
      }

      // Salvar no banco
      const { data: nota, error } = await supabase
        .from("notas_fiscais")
        .insert({
          company_id: currentCompany?.id,
          numero: formData.numero,
          serie: formData.serie,
          tipo: formData.tipo,
          natureza_operacao: formData.natureza_operacao,
          data_emissao: formData.data_emissao,
          destinatario_nome: formData.destinatario_razao_social,
          destinatario_documento: formData.destinatario_documento,
          valor_total: totais.totalNF,
          situacao: "em_aberto",
          dados_json: {
            formData,
            produtos,
            totais,
          },
        })
        .select()
        .single();

      if (error) throw error;

      if (emitir) {
        // Chamar API de emissão
        toast.info("Emitindo NF-e...");
        // await emitirNFe(nota.id);
      }

      toast.success(emitir ? "NF-e emitida com sucesso!" : "NF-e salva com sucesso!");
      navigate("/notas-fiscais");
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
          <Link to="/notas-fiscais" className="hover:text-foreground">NF-e</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Adicionar</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Adicionar NF-e</h1>

      {/* Dados Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Número</Label>
            <Input
              value={formData.numero}
              onChange={(e) => setFormData(prev => ({ ...prev, numero: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Série</Label>
            <Input
              value={formData.serie}
              onChange={(e) => setFormData(prev => ({ ...prev, serie: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Natureza da operação <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Ex: Venda de mercadoria"
              value={formData.natureza_operacao}
              onChange={(e) => setFormData(prev => ({ ...prev, natureza_operacao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value: "entrada" | "saida") => setFormData(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Consumidor final</Label>
            <Select
              value={formData.consumidor_final ? "sim" : "nao"}
              onValueChange={(value) => setFormData(prev => ({ ...prev, consumidor_final: value === "sim" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
              </SelectContent>
            </Select>
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
            <Label>Hora de emissão</Label>
            <Input
              type="time"
              value={formData.hora_emissao}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_emissao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Data de saída/entrada</Label>
            <Input
              type="date"
              value={formData.data_saida_entrada}
              onChange={(e) => setFormData(prev => ({ ...prev, data_saida_entrada: e.target.value }))}
            />
          </div>
          <div>
            <Label>Hora de saída/entrada</Label>
            <Input
              type="time"
              value={formData.hora_saida_entrada}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_saida_entrada: e.target.value }))}
            />
          </div>
          <div>
            <Label>Finalidade de emissão</Label>
            <Select
              value={formData.finalidade}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, finalidade: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">NF-e normal</SelectItem>
                <SelectItem value="complementar">NF-e complementar</SelectItem>
                <SelectItem value="ajuste">NF-e de ajuste</SelectItem>
                <SelectItem value="devolucao">Devolução de mercadoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Forma de emissão</Label>
            <Select
              value={formData.forma_emissao}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, forma_emissao: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Emissão normal</SelectItem>
                <SelectItem value="contingencia">Contingência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destino da operação</Label>
            <Select
              value={formData.destino_operacao}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, destino_operacao: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interna">Operação interna</SelectItem>
                <SelectItem value="interestadual">Operação interestadual</SelectItem>
                <SelectItem value="exterior">Operação com exterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de atendimento</Label>
            <Select
              value={formData.tipo_atendimento}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo_atendimento: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                <SelectItem value="presencial">Operação presencial</SelectItem>
                <SelectItem value="internet">Operação não presencial, pela Internet</SelectItem>
                <SelectItem value="teleatendimento">Operação não presencial, Teleatendimento</SelectItem>
                <SelectItem value="outros">Operação não presencial, outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Destinatário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do destinatário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cliente/Fornecedor</Label>
              <SearchableSelect
                options={(pessoas || []).map(p => ({
                  value: p.id,
                  label: p.razao_social || "",
                  sublabel: p.cpf_cnpj || "",
                }))}
                value={formData.destinatario_id}
                onValueChange={handleDestinatarioChange}
                placeholder="Digite para buscar"
              />
            </div>
            <div>
              <Label>Tipo de documento</Label>
              <Select
                value={formData.destinatario_tipo_documento}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, destinatario_tipo_documento: value }))}
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
                value={formData.destinatario_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_documento: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Razão social <span className="text-red-500">*</span></Label>
              <Input
                value={formData.destinatario_razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_razao_social: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo de contribuinte</Label>
              <Select
                value={formData.destinatario_tipo_contribuinte}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, destinatario_tipo_contribuinte: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribuinte">Contribuinte ICMS</SelectItem>
                  <SelectItem value="isento">Contribuinte ISENTO</SelectItem>
                  <SelectItem value="nao_contribuinte">Não contribuinte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inscrição estadual</Label>
              <Input
                value={formData.destinatario_ie}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_ie: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.destinatario_cep}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_cep: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Logradouro</Label>
              <Input
                value={formData.destinatario_logradouro}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_logradouro: e.target.value }))}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={formData.destinatario_numero}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_numero: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Complemento</Label>
              <Input
                value={formData.destinatario_complemento}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_complemento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input
                value={formData.destinatario_bairro}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_bairro: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cidade/UF</Label>
              <Input
                value={`${formData.destinatario_cidade}${formData.destinatario_uf ? ` - ${formData.destinatario_uf}` : ""}`}
                onChange={(e) => {
                  const [cidade, uf] = e.target.value.split(" - ");
                  setFormData(prev => ({ ...prev, destinatario_cidade: cidade || "", destinatario_uf: uf || "" }));
                }}
              />
            </div>
            <div>
              <Label>País</Label>
              <Input
                value={formData.destinatario_pais}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_pais: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.destinatario_telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_telefone: e.target.value }))}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.destinatario_email}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="endereco_entrega"
                checked={mostrarEnderecoEntrega}
                onCheckedChange={(checked) => setMostrarEnderecoEntrega(!!checked)}
              />
              <label htmlFor="endereco_entrega" className="text-sm">Informar endereço de entrega</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="endereco_retirada"
                checked={mostrarEnderecoRetirada}
                onCheckedChange={(checked) => setMostrarEnderecoRetirada(!!checked)}
              />
              <label htmlFor="endereco_retirada" className="text-sm">Informar endereço de retirada</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Produtos</CardTitle>
          <Button onClick={handleAddProduto} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar produto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum produto adicionado
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((produto, index) => (
                  <TableRow key={produto.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        placeholder="Descrição do produto"
                        value={produto.descricao}
                        onChange={(e) => handleProdutoChange(produto.id, "descricao", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="NCM"
                        value={produto.ncm}
                        onChange={(e) => handleProdutoChange(produto.id, "ncm", e.target.value)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="CFOP"
                        value={produto.cfop}
                        onChange={(e) => handleProdutoChange(produto.id, "cfop", e.target.value)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) => handleProdutoChange(produto.id, "quantidade", parseFloat(e.target.value) || 0)}
                        className="w-20 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={produto.valor_unitario}
                        onChange={(e) => handleProdutoChange(produto.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produto.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduto(produto.id)}
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

      {/* Transporte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Modalidade</Label>
              <Select
                value={formData.modalidade_frete}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, modalidade_frete: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cif">Contratação do Frete por conta do Remetente (CIF)</SelectItem>
                  <SelectItem value="fob">Contratação do Frete por conta do Destinatário (FOB)</SelectItem>
                  <SelectItem value="terceiros">Contratação do Frete por conta de Terceiros</SelectItem>
                  <SelectItem value="proprio_remetente">Transporte Próprio por conta do Remetente</SelectItem>
                  <SelectItem value="proprio_destinatario">Transporte Próprio por conta do Destinatário</SelectItem>
                  <SelectItem value="sem_frete">Sem Ocorrência de Transporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transportadora</Label>
              <Input
                placeholder="Digite para buscar"
                value={formData.transportadora_razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, transportadora_razao_social: e.target.value }))}
              />
            </div>
            <div>
              <Label>Placa do veículo</Label>
              <Input
                placeholder="AAA0000"
                value={formData.veiculo_placa}
                onChange={(e) => setFormData(prev => ({ ...prev, veiculo_placa: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volumes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volumes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={formData.volumes_quantidade}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_quantidade: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Peso líquido (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.volumes_peso_liquido}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_peso_liquido: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Peso bruto (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.volumes_peso_bruto}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_peso_bruto: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Espécie</Label>
              <Input
                placeholder="Ex: Caixa"
                value={formData.volumes_especie}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_especie: e.target.value }))}
              />
            </div>
            <div>
              <Label>Marca</Label>
              <Input
                value={formData.volumes_marca}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_marca: e.target.value }))}
              />
            </div>
            <div>
              <Label>Numeração</Label>
              <Input
                value={formData.volumes_numeracao}
                onChange={(e) => setFormData(prev => ({ ...prev, volumes_numeracao: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totais da Nota */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Totais da nota</CardTitle>
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <Label>Total BC ICMS</Label>
              <Input value="0,00" readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total ICMS</Label>
              <Input value={totais.totalICMS.toFixed(2).replace(".", ",")} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total bruto produtos</Label>
              <Input value={totais.totalProdutos.toFixed(2).replace(".", ",")} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total de frete</Label>
              <Input value="0,00" readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total de desconto</Label>
              <Input value="0,00" readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total de IPI</Label>
              <Input value="0,00" readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total de PIS</Label>
              <Input value={totais.totalPIS.toFixed(2).replace(".", ",")} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Total de COFINS</Label>
              <Input value={totais.totalCOFINS.toFixed(2).replace(".", ",")} readOnly className="bg-muted" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-lg font-bold">Total da NF</Label>
              <Input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totais.totalNF)}
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
        <CardContent className="space-y-4">
          <div>
            <Label>Informações complementares</Label>
            <Textarea
              placeholder="O valor aprox. tributos será acrescentado automaticamente."
              value={formData.info_complementares}
              onChange={(e) => setFormData(prev => ({ ...prev, info_complementares: e.target.value }))}
              rows={3}
            />
          </div>
          <div>
            <Label>Informações para o Fisco</Label>
            <Textarea
              placeholder="Informações reservadas para o Fisco."
              value={formData.info_fisco}
              onChange={(e) => setFormData(prev => ({ ...prev, info_fisco: e.target.value }))}
              rows={3}
            />
          </div>
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
          <Link to="/notas-fiscais">Cancelar</Link>
        </Button>
      </div>
    </div>
  );
}
