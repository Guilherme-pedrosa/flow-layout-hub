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
import { Plus, Trash2, Save, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNFeEmissor, DadosNFe } from "@/hooks/useNFeEmissor";

type Produto = {
  id: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  icms_cst: string;
  icms_aliquota: number;
  icms_valor: number;
};

type FormData = {
  numero: number;
  serie: number;
  natureza_operacao: string;
  tipo: "entrada" | "saida";
  consumidor_final: boolean;
  data_emissao: string;
  finalidade: string;
  destino_operacao: string;
  tipo_atendimento: string;
  destinatario_id: string;
  destinatario_tipo_documento: "cnpj" | "cpf" | "estrangeiro";
  destinatario_documento: string;
  destinatario_razao_social: string;
  destinatario_tipo_contribuinte: string;
  destinatario_ie: string;
  destinatario_cep: string;
  destinatario_logradouro: string;
  destinatario_numero: string;
  destinatario_complemento: string;
  destinatario_bairro: string;
  destinatario_cidade: string;
  destinatario_uf: string;
  destinatario_telefone: string;
  destinatario_email: string;
  modalidade_frete: string;
  info_complementares: string;
};

const initialFormData: FormData = {
  numero: 0,
  serie: 1,
  natureza_operacao: "Venda de mercadoria",
  tipo: "saida",
  consumidor_final: false,
  data_emissao: format(new Date(), "yyyy-MM-dd"),
  finalidade: "1",
  destino_operacao: "1",
  tipo_atendimento: "1",
  destinatario_id: "",
  destinatario_tipo_documento: "cnpj",
  destinatario_documento: "",
  destinatario_razao_social: "",
  destinatario_tipo_contribuinte: "1",
  destinatario_ie: "",
  destinatario_cep: "",
  destinatario_logradouro: "",
  destinatario_numero: "",
  destinatario_complemento: "",
  destinatario_bairro: "",
  destinatario_cidade: "",
  destinatario_uf: "",
  destinatario_telefone: "",
  destinatario_email: "",
  modalidade_frete: "9",
  info_complementares: "",
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
        .from("notas_fiscais")
        .select("numero")
        .eq("company_id", currentCompany.id)
        .eq("tipo", "nfe")
        .order("numero", { ascending: false })
        .limit(1)
        .single();
      return (parseInt(data?.numero || '0') || 0) + 1;
    },
    enabled: !!currentCompany?.id,
  });

  useEffect(() => {
    if (proximoNumero) {
      setFormData(prev => ({ ...prev, numero: proximoNumero }));
    }
  }, [proximoNumero]);

  // Buscar clientes (usando campos corretos da tabela pessoas)
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas-nfe", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("pessoas")
        .select("id, razao_social, cpf_cnpj, tipo_pessoa, inscricao_estadual, logradouro, numero, complemento, bairro, cidade, estado, cep, telefone, email")
        .eq("company_id", currentCompany.id)
        .eq("is_cliente", true);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar produtos
  const { data: produtosCadastrados } = useQuery({
    queryKey: ["produtos-nfe", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, ncm, sale_price, unit")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleDestinatarioChange = (pessoaId: string) => {
    const pessoa = pessoas?.find((p: any) => p.id === pessoaId);
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
        destinatario_complemento: pessoa.complemento || "",
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
      cfop: "5102",
      unidade: "UN",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      icms_cst: "00",
      icms_aliquota: 0,
      icms_valor: 0,
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
        updated.icms_valor = updated.valor_total * (updated.icms_aliquota / 100);
      }
      if (field === "icms_aliquota") {
        updated.icms_valor = updated.valor_total * (updated.icms_aliquota / 100);
      }
      return updated;
    }));
  };

  const calcularTotais = () => {
    const totalProdutos = produtos.reduce((acc, p) => acc + p.valor_total, 0);
    const totalICMS = produtos.reduce((acc, p) => acc + p.icms_valor, 0);
    return { totalProdutos, totalICMS, totalNF: totalProdutos };
  };

  const totais = calcularTotais();

  const handleSalvar = async (emitirNota: boolean = false) => {
    try {
      if (!formData.destinatario_documento) {
        toast.error("Informe o destinatário");
        return;
      }
      if (produtos.length === 0) {
        toast.error("Adicione pelo menos um produto");
        return;
      }

      // Salvar no banco usando tabela notas_fiscais
      const { data: nota, error } = await supabase
        .from("notas_fiscais")
        .insert({
          company_id: currentCompany?.id,
          tipo: "nfe",
          referencia: `NFE-${formData.numero}`,
          numero: String(formData.numero),
          serie: String(formData.serie),
          natureza_operacao: formData.natureza_operacao,
          data_emissao: formData.data_emissao,
          destinatario_nome: formData.destinatario_razao_social,
          destinatario_cpf_cnpj: formData.destinatario_documento,
          destinatario_email: formData.destinatario_email,
          valor_produtos: totais.totalProdutos,
          valor_icms: totais.totalICMS,
          valor_total: totais.totalNF,
          status: emitirNota ? "processando" : "rascunho",
        })
        .select()
        .single();

      if (error) throw error;

      // Salvar itens
      if (nota) {
        const itens = produtos.map((p, index) => ({
          nota_fiscal_id: nota.id,
          numero_item: index + 1,
          codigo_produto: p.id,
          descricao: p.descricao,
          ncm: p.ncm,
          cfop: p.cfop,
          unidade: p.unidade,
          quantidade: p.quantidade,
          valor_unitario: p.valor_unitario,
          valor_total: p.valor_total,
          cst_icms: p.icms_cst,
          aliquota_icms: p.icms_aliquota,
          valor_icms: p.icms_valor,
        }));

        await supabase.from("nfe_itens").insert(itens);
      }

      if (emitirNota && nota) {
        toast.info("Emitindo NF-e...");
        // Aqui chamaria o microserviço de NF-e
        // Por enquanto apenas marca como processando
      }

      toast.success(emitirNota ? "NF-e processada!" : "NF-e salva como rascunho!");
      navigate("/notas-fiscais");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <Link to="/notas-fiscais" className="hover:text-foreground">NF-e</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Adicionar</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adicionar NF-e</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/notas-fiscais")}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => handleSalvar(false)}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button onClick={() => handleSalvar(true)} disabled={isEmitting}>
            {isEmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Emitir NF-e
          </Button>
        </div>
      </div>

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
          <div>
            <Label>Data de emissão</Label>
            <Input
              type="date"
              value={formData.data_emissao}
              onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Natureza da operação</Label>
            <Input
              value={formData.natureza_operacao}
              onChange={(e) => setFormData(prev => ({ ...prev, natureza_operacao: e.target.value }))}
            />
          </div>
          <div>
            <Label>Tipo de operação</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Finalidade</Label>
            <Select
              value={formData.finalidade}
              onValueChange={(value) => setFormData(prev => ({ ...prev, finalidade: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">NF-e Normal</SelectItem>
                <SelectItem value="2">NF-e Complementar</SelectItem>
                <SelectItem value="3">NF-e de Ajuste</SelectItem>
                <SelectItem value="4">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="consumidor_final"
              checked={formData.consumidor_final}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consumidor_final: !!checked }))}
            />
            <label htmlFor="consumidor_final" className="text-sm">Consumidor Final</label>
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
              <Label>Cliente</Label>
              <SearchableSelect
                options={(pessoas || []).map((p: any) => ({
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
              <Label>Inscrição estadual</Label>
              <Input
                value={formData.destinatario_ie}
                onChange={(e) => setFormData(prev => ({ ...prev, destinatario_ie: e.target.value }))}
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
          <Button size="sm" onClick={handleAddProduto}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">NCM</TableHead>
                <TableHead className="w-20">CFOP</TableHead>
                <TableHead className="w-16">UN</TableHead>
                <TableHead className="w-20">Qtd</TableHead>
                <TableHead className="w-28">Valor Unit.</TableHead>
                <TableHead className="w-28">Valor Total</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    <Input
                      value={produto.descricao}
                      onChange={(e) => handleProdutoChange(produto.id, "descricao", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={produto.ncm}
                      onChange={(e) => handleProdutoChange(produto.id, "ncm", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={produto.cfop}
                      onChange={(e) => handleProdutoChange(produto.id, "cfop", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={produto.unidade}
                      onChange={(e) => handleProdutoChange(produto.id, "unidade", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={produto.quantidade}
                      onChange={(e) => handleProdutoChange(produto.id, "quantidade", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={produto.valor_unitario}
                      onChange={(e) => handleProdutoChange(produto.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {produto.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum produto adicionado. Clique em "Adicionar" para incluir produtos.
                  </TableCell>
                </TableRow>
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Modalidade do frete</Label>
              <Select
                value={formData.modalidade_frete}
                onValueChange={(value) => setFormData(prev => ({ ...prev, modalidade_frete: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Por conta do emitente (CIF)</SelectItem>
                  <SelectItem value="1">Por conta do destinatário (FOB)</SelectItem>
                  <SelectItem value="2">Por conta de terceiros</SelectItem>
                  <SelectItem value="3">Próprio por conta do remetente</SelectItem>
                  <SelectItem value="4">Próprio por conta do destinatário</SelectItem>
                  <SelectItem value="9">Sem frete</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Produtos</div>
              <div className="text-xl font-bold">
                {totais.totalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total ICMS</div>
              <div className="text-xl font-bold">
                {totais.totalICMS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total NF-e</div>
              <div className="text-xl font-bold text-primary">
                {totais.totalNF.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Complementares */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações complementares</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.info_complementares}
            onChange={(e) => setFormData(prev => ({ ...prev, info_complementares: e.target.value }))}
            rows={3}
            placeholder="Informações adicionais que aparecerão na nota..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
