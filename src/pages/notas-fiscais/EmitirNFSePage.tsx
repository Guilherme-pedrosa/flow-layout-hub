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
import { useNFSeEmissor, DadosNFSe } from "@/hooks/useNFSeEmissor";

type Servico = {
  id: string;
  descricao: string;
  codigo_servico: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  aliquota_iss: number;
  valor_iss: number;
  iss_retido: boolean;
};

type FormData = {
  numero: number;
  data_emissao: string;
  data_competencia: string;
  natureza_operacao: string;
  regime_tributacao: string;
  optante_simples: boolean;
  incentivador_cultural: boolean;
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
  tomador_telefone: string;
  tomador_email: string;
  discriminacao: string;
  valor_deducoes: number;
  desconto_incondicionado: number;
  valor_pis: number;
  valor_cofins: number;
  valor_inss: number;
  valor_ir: number;
  valor_csll: number;
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
  tomador_telefone: "",
  tomador_email: "",
  discriminacao: "",
  valor_deducoes: 0,
  desconto_incondicionado: 0,
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
  const { emitir, loading: isEmitting } = useNFSeEmissor();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Buscar próximo número de nota (usando tabela notas_fiscais com tipo='nfse')
  const { data: proximoNumero } = useQuery({
    queryKey: ["proximo-numero-nfse", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return 1;
      const { data } = await supabase
        .from("notas_fiscais")
        .select("numero")
        .eq("company_id", currentCompany.id)
        .eq("tipo", "nfse")
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
    queryKey: ["pessoas-nfse", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("pessoas")
        .select("id, razao_social, cpf_cnpj, tipo_pessoa, inscricao_municipal, logradouro, numero, complemento, bairro, cidade, estado, cep, telefone, email")
        .eq("company_id", currentCompany.id)
        .eq("is_cliente", true);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar serviços cadastrados
  const { data: servicosCadastrados } = useQuery({
    queryKey: ["servicos-nfse", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data } = await supabase
        .from("services")
        .select("id, name, sale_price")
        .eq("company_id", currentCompany.id);
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleTomadorChange = (pessoaId: string) => {
    const pessoa = pessoas?.find((p: any) => p.id === pessoaId);
    if (pessoa) {
      setFormData(prev => ({
        ...prev,
        tomador_id: pessoa.id,
        tomador_tipo_documento: pessoa.cpf_cnpj?.length === 14 ? "cnpj" : "cpf",
        tomador_documento: pessoa.cpf_cnpj || "",
        tomador_razao_social: pessoa.razao_social || "",
        tomador_im: pessoa.inscricao_municipal || "",
        tomador_cep: pessoa.cep || "",
        tomador_logradouro: pessoa.logradouro || "",
        tomador_numero: pessoa.numero || "",
        tomador_complemento: pessoa.complemento || "",
        tomador_bairro: pessoa.bairro || "",
        tomador_cidade: pessoa.cidade || "",
        tomador_uf: pessoa.estado || "",
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
    const totalRetencoes = formData.valor_pis + formData.valor_cofins + formData.valor_inss + formData.valor_ir + formData.valor_csll + totalISSRetido;
    const valorLiquido = totalServicos - formData.desconto_incondicionado - totalRetencoes;
    
    return { totalServicos, baseCalculo, totalISS, totalISSRetido, totalRetencoes, valorLiquido };
  };

  const totais = calcularTotais();

  const handleSalvar = async (emitirNota: boolean = false) => {
    try {
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

      // Salvar no banco usando tabela notas_fiscais
      const { data: nota, error } = await supabase
        .from("notas_fiscais")
        .insert({
          company_id: currentCompany?.id,
          tipo: "nfse",
          referencia: `NFSE-${formData.numero}`,
          numero: String(formData.numero),
          data_emissao: formData.data_emissao,
          destinatario_nome: formData.tomador_razao_social,
          destinatario_cpf_cnpj: formData.tomador_documento,
          destinatario_email: formData.tomador_email,
          natureza_operacao: formData.natureza_operacao,
          valor_total: totais.totalServicos,
          status: emitirNota ? "processando" : "rascunho",
        })
        .select()
        .single();

      if (error) throw error;

      if (emitirNota && nota) {
        toast.info("Emitindo NFS-e...");
        
        const dadosNFSe: DadosNFSe = {
          tomador: {
            cpfCnpj: formData.tomador_documento.replace(/\D/g, ''),
            inscricaoMunicipal: formData.tomador_im,
            razaoSocial: formData.tomador_razao_social,
            email: formData.tomador_email,
            telefone: formData.tomador_telefone,
            logradouro: formData.tomador_logradouro,
            numero: formData.tomador_numero,
            complemento: formData.tomador_complemento,
            bairro: formData.tomador_bairro,
            codigoMunicipio: "",
            municipio: formData.tomador_cidade,
            uf: formData.tomador_uf,
            cep: formData.tomador_cep.replace(/\D/g, ''),
          },
          servico: {
            codigoServico: servicos[0]?.codigo_servico || "",
            discriminacao: formData.discriminacao,
            valorServicos: totais.totalServicos,
            valorDeducoes: formData.valor_deducoes,
            aliquotaIss: servicos[0]?.aliquota_iss || 5,
            issRetido: servicos.some(s => s.iss_retido),
          },
          naturezaOperacao: parseInt(formData.natureza_operacao),
          optanteSimplesNacional: formData.optante_simples,
          incentivadorCultural: formData.incentivador_cultural,
          informacoesComplementares: formData.info_complementares,
        };

        const resultado = await emitir(dadosNFSe);
        
        if (resultado.sucesso) {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "autorizada",
              chave_nfe: resultado.codigoVerificacao,
              data_autorizacao: new Date().toISOString(),
            })
            .eq("id", nota.id);
        } else {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "erro",
              mensagem_sefaz: resultado.motivo,
            })
            .eq("id", nota.id);
        }
      }

      toast.success(emitirNota ? "NFS-e processada!" : "NFS-e salva como rascunho!");
      navigate("/notas-fiscais-servico");
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
          <Link to="/notas-fiscais-servico" className="hover:text-foreground">NFS-e</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Adicionar</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adicionar NFS-e</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/notas-fiscais-servico")}>
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
            Emitir NFS-e
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
                options={(pessoas || []).map((p: any) => ({
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
          <Button size="sm" onClick={handleAddServico}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20">Qtd</TableHead>
                <TableHead className="w-28">Valor Unit.</TableHead>
                <TableHead className="w-28">Valor Total</TableHead>
                <TableHead className="w-20">Alíq. ISS</TableHead>
                <TableHead className="w-24">ISS Retido</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((servico) => (
                <TableRow key={servico.id}>
                  <TableCell>
                    <Input
                      value={servico.codigo_servico}
                      onChange={(e) => handleServicoChange(servico.id, "codigo_servico", e.target.value)}
                      placeholder="Ex: 14.01"
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={servico.descricao}
                      onChange={(e) => handleServicoChange(servico.id, "descricao", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={servico.quantidade}
                      onChange={(e) => handleServicoChange(servico.id, "quantidade", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={servico.valor_unitario}
                      onChange={(e) => handleServicoChange(servico.id, "valor_unitario", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {servico.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={servico.aliquota_iss}
                      onChange={(e) => handleServicoChange(servico.id, "aliquota_iss", parseFloat(e.target.value) || 0)}
                    />
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
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {servicos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum serviço adicionado. Clique em "Adicionar" para incluir serviços.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discriminação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discriminação dos serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.discriminacao}
            onChange={(e) => setFormData(prev => ({ ...prev, discriminacao: e.target.value }))}
            rows={4}
            placeholder="Descreva detalhadamente os serviços prestados..."
          />
        </CardContent>
      </Card>

      {/* Retenções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retenções</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Totais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Serviços</div>
              <div className="text-xl font-bold">
                {totais.totalServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Base de Cálculo</div>
              <div className="text-xl font-bold">
                {totais.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total ISS</div>
              <div className="text-xl font-bold">
                {totais.totalISS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Valor Líquido</div>
              <div className="text-xl font-bold text-primary">
                {totais.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
