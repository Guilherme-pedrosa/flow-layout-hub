import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { formatCep } from "@/lib/formatters";
import { consultarCep } from "@/lib/api/cnpj";
import { useToast } from "@/hooks/use-toast";

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

interface ClienteFormEnderecoProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClienteFormEndereco({ formData, setFormData }: ClienteFormEnderecoProps) {
  const [loadingCep, setLoadingCep] = useState(false);
  const { toast } = useToast();

  const handleCepSearch = async () => {
    if (!formData.cep) return;

    setLoadingCep(true);
    try {
      const data = await consultarCep(formData.cep);
      
      if (data) {
        setFormData({
          ...formData,
          logradouro: data.logradouro || formData.logradouro,
          complemento: data.complemento || formData.complemento,
          bairro: data.bairro || formData.bairro,
          cidade: data.localidade || formData.cidade,
          estado: data.uf || formData.estado,
        });

        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Preencha o endereço manualmente.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro na consulta",
        description: "Não foi possível consultar o CEP.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* CEP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              value={formatCep(formData.cep || '')}
              onChange={(e) => handleChange('cep', e.target.value.replace(/\D/g, ''))}
              placeholder="00000-000"
              maxLength={9}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCepSearch}
              disabled={loadingCep || !formData.cep}
            >
              {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Logradouro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="logradouro">Logradouro</Label>
          <Input
            id="logradouro"
            value={formData.logradouro || ''}
            onChange={(e) => handleChange('logradouro', e.target.value)}
            placeholder="Rua, Avenida, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={formData.numero || ''}
            onChange={(e) => handleChange('numero', e.target.value)}
            placeholder="Nº"
          />
        </div>
      </div>

      {/* Complemento e Bairro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={formData.complemento || ''}
            onChange={(e) => handleChange('complemento', e.target.value)}
            placeholder="Sala, Bloco, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={formData.bairro || ''}
            onChange={(e) => handleChange('bairro', e.target.value)}
            placeholder="Bairro"
          />
        </div>
      </div>

      {/* Cidade e Estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={formData.cidade || ''}
            onChange={(e) => handleChange('cidade', e.target.value)}
            placeholder="Cidade"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            value={formData.estado || ''}
            onValueChange={(value) => handleChange('estado', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((estado) => (
                <SelectItem key={estado.sigla} value={estado.sigla}>
                  {estado.sigla} - {estado.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
