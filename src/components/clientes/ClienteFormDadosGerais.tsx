import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertTriangle } from "lucide-react";
import { formatCpfCnpj, formatTelefone } from "@/lib/formatters";
import { consultarCnpj } from "@/lib/api/cnpj";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClienteFormDadosGeraisProps {
  formData: any;
  setFormData: (data: any) => void;
  duplicateWarning: boolean;
}

export function ClienteFormDadosGerais({ formData, setFormData, duplicateWarning }: ClienteFormDadosGeraisProps) {
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const { toast } = useToast();

  const handleCnpjSearch = async () => {
    if (!formData.cpf_cnpj || formData.tipo_pessoa !== 'PJ') return;

    setLoadingCnpj(true);
    try {
      const data = await consultarCnpj(formData.cpf_cnpj);
      
      if (data) {
        setFormData({
          ...formData,
          razao_social: data.nome || formData.razao_social,
          nome_fantasia: data.fantasia || formData.nome_fantasia,
          situacao_cadastral: data.situacao || formData.situacao_cadastral,
          data_abertura: data.abertura ? data.abertura.split('/').reverse().join('-') : formData.data_abertura,
          cnae_principal: data.atividade_principal?.[0]?.text || formData.cnae_principal,
          email: data.email || formData.email,
          telefone: data.telefone || formData.telefone,
          cep: data.cep?.replace(/\D/g, '') || formData.cep,
          logradouro: data.logradouro || formData.logradouro,
          numero: data.numero || formData.numero,
          complemento: data.complemento || formData.complemento,
          bairro: data.bairro || formData.bairro,
          cidade: data.municipio || formData.cidade,
          estado: data.uf || formData.estado,
        });

        toast({
          title: "CNPJ encontrado",
          description: "Dados preenchidos automaticamente. Revise e edite se necessário.",
        });
      } else {
        toast({
          title: "CNPJ não encontrado",
          description: "Não foi possível localizar os dados. Preencha manualmente.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro na consulta",
        description: "Não foi possível consultar o CNPJ. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Pessoa */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Tipo de Cliente</Label>
        <RadioGroup
          value={formData.tipo_pessoa}
          onValueChange={(value) => handleChange('tipo_pessoa', value)}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PJ" id="pj" />
            <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica (PJ)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PF" id="pf" />
            <Label htmlFor="pf" className="cursor-pointer">Pessoa Física (PF)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* CPF/CNPJ com busca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpf_cnpj">{formData.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
          <div className="flex gap-2">
            <Input
              id="cpf_cnpj"
              value={formatCpfCnpj(formData.cpf_cnpj || '', formData.tipo_pessoa)}
              onChange={(e) => handleChange('cpf_cnpj', e.target.value.replace(/\D/g, ''))}
              placeholder={formData.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              maxLength={formData.tipo_pessoa === 'PJ' ? 18 : 14}
            />
            {formData.tipo_pessoa === 'PJ' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCnpjSearch}
                disabled={loadingCnpj || !formData.cpf_cnpj}
              >
                {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerta de duplicidade */}
      {duplicateWarning && (
        <Alert variant="destructive" className="bg-warning/10 border-warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Já existe um cliente cadastrado com este CPF/CNPJ. Você pode continuar salvando se desejar.
          </AlertDescription>
        </Alert>
      )}

      {/* Razão Social / Nome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="razao_social">{formData.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}</Label>
          <Input
            id="razao_social"
            value={formData.razao_social || ''}
            onChange={(e) => handleChange('razao_social', e.target.value)}
            placeholder={formData.tipo_pessoa === 'PJ' ? 'Razão social da empresa' : 'Nome completo'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
          <Input
            id="nome_fantasia"
            value={formData.nome_fantasia || ''}
            onChange={(e) => handleChange('nome_fantasia', e.target.value)}
            placeholder="Nome fantasia"
          />
        </div>
      </div>

      {/* Dados adicionais PJ */}
      {formData.tipo_pessoa === 'PJ' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="situacao_cadastral">Situação Cadastral</Label>
              <Input
                id="situacao_cadastral"
                value={formData.situacao_cadastral || ''}
                onChange={(e) => handleChange('situacao_cadastral', e.target.value)}
                placeholder="Ex: ATIVA"
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_abertura">Data de Abertura</Label>
              <Input
                id="data_abertura"
                type="date"
                value={formData.data_abertura || ''}
                onChange={(e) => handleChange('data_abertura', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnae_principal">CNAE Principal</Label>
              <Input
                id="cnae_principal"
                value={formData.cnae_principal || ''}
                onChange={(e) => handleChange('cnae_principal', e.target.value)}
                placeholder="Atividade principal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={formData.inscricao_estadual || ''}
                onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                placeholder="IE ou ISENTO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
              <Input
                id="inscricao_municipal"
                value={formData.inscricao_municipal || ''}
                onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
                placeholder="IM"
              />
            </div>
          </div>
        </>
      )}

      {/* Contato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formatTelefone(formData.telefone || '')}
            onChange={(e) => handleChange('telefone', e.target.value.replace(/\D/g, ''))}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );
}
