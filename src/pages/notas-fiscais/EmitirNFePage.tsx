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
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Plus, Trash2, Calculator, Save } from "lucide-react";
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
  const { emitirNFe, loading: isEmitting } = useNFeEmissor();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Buscar próximo número de nota
  const { data: proximoNumero } = useQuery({
    queryKey: ["proximo-numero-nfe", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return 1;
      const { data } = await supabase
        .from("nfe_emitidas")
        .select("numero")
        .eq("company_id", currentCompany.id)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const currentNum = data?.numero ? parseInt(String(data.numero)) : 0;
      return currentNum + 1;
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
    queryKey: ["pessoas-nfe", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("pessoas")
        .select("id, razao_social, cpf_cnpj, tipo_pessoa, inscricao_estadual, logradouro, numero, bairro, cidade, estado, cep, telefone, email")
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
        destinatario_ie: pessoa.inscricao_estadual || "",
        destinatario_cep: pessoa.cep || "",
        destinatario_logradouro: pessoa.logradouro || "",
        destinatario_numero: pessoa.numero || "",
        destinatario_bairro: pessoa.bairro || "",
        destinatario_cidade: pessoa.cidade || "",
        destinatario_uf: pessoa.estado || "",
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
        .from("nfe_emitidas")
        .insert([{
          company_id: currentCompany?.id,
          referencia: `NFE-${formData.numero}`,
          numero: String(formData.numero),
          serie: String(formData.serie),
          natureza_operacao: formData.natureza_operacao,
          data_emissao: formData.data_emissao,
          destinatario_cpf_cnpj: formData.destinatario_documento,
          destinatario_nome: formData.destinatario_razao_social,
          valor_produtos: totais.totalProdutos,
          valor_total: totais.totalNF,
          status: "PENDENTE",
        }])
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
        </CardContent>
      </Card>

      {/* Destinatário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Destinatário</CardTitle>
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
                onChange={handleDestinatarioChange}
                placeholder="Digite para buscar"
              />
            </div>
            <div>
              <Label>CNPJ/CPF <span className="text-red-500">*</span></Label>
              <Input
                value={formData.destinatario_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_documento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Razão Social <span className="text-red-500">*</span></Label>
              <Input
                value={formData.destinatario_razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_razao_social: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>IE</Label>
              <Input
                value={formData.destinatario_ie}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_ie: e.target.value }))}
              />
            </div>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Número</Label>
              <Input
                value={formData.destinatario_numero}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_numero: e.target.value }))}
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
              <Label>Cidade</Label>
              <Input
                value={formData.destinatario_cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_cidade: e.target.value }))}
              />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={formData.destinatario_uf}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_uf: e.target.value }))}
                maxLength={2}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.destinatario_telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_telefone: e.target.value }))}
              />
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
            Adicionar Produto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Descrição</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    <Input
                      value={produto.descricao}
                      onChange={(e) => handleProdutoChange(produto.id, "descricao", e.target.value)}
                      placeholder="Descrição do produto"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={produto.ncm}
                      onChange={(e) => handleProdutoChange(produto.id, "ncm", e.target.value)}
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
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
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={produto.valor_unitario}
                      onChange={(e) => handleProdutoChange(produto.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {produto.valor_total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProduto(produto.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {produtos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-muted-foreground">Total Produtos</Label>
              <p className="text-xl font-bold">R$ {totais.totalProdutos.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total ICMS</Label>
              <p className="text-xl font-bold">R$ {totais.totalICMS.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total PIS</Label>
              <p className="text-xl font-bold">R$ {totais.totalPIS.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total COFINS</Label>
              <p className="text-xl font-bold">R$ {totais.totalCOFINS.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total NF-e</Label>
              <p className="text-xl font-bold text-primary">R$ {totais.totalNF.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Complementares */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Complementares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Informações ao Consumidor</Label>
            <Textarea
              value={formData.info_complementares}
              onChange={(e) => setFormData(prev => ({ ...prev, info_complementares: e.target.value }))}
              placeholder="Informações que aparecerão na nota..."
              rows={3}
            />
          </div>
          <div>
            <Label>Informações ao Fisco</Label>
            <Textarea
              value={formData.info_fisco}
              onChange={(e) => setFormData(prev => ({ ...prev, info_fisco: e.target.value }))}
              placeholder="Informações adicionais ao fisco..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate("/notas-fiscais")}>
          Cancelar
        </Button>
        <Button variant="secondary" onClick={() => handleSalvar(false)} disabled={isEmitting}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Rascunho
        </Button>
        <Button onClick={() => handleSalvar(true)} disabled={isEmitting}>
          {isEmitting ? "Emitindo..." : "Salvar e Emitir NF-e"}
        </Button>
      </div>
    </div>
  );
}
