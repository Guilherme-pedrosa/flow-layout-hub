import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NovoChamado() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    os_numero: "",
    os_data: "",
    distrito: "",
    nome_gt: "",
    cliente_codigo: "",
    cliente_nome: "",
    tra_nome: "",
    observacao: "",
    status: "aguardando_agendamento",
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.os_numero.trim()) {
      toast.error("Número da OS é obrigatório");
      return;
    }
    
    if (!currentCompany?.id) {
      toast.error("Empresa não selecionada");
      return;
    }
    
    setLoading(true);
    
    try {
      // Verificar duplicado
      const { data: existing } = await supabase
        .from('chamados')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('os_numero', formData.os_numero)
        .single();
      
      if (existing) {
        toast.error(`Chamado OS ${formData.os_numero} já existe.`);
        setLoading(false);
        return;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      let userId: string | null = null;
      
      if (userData.user?.id) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user.id)
          .single();
        userId = user?.id || null;
      }
      
      const { error } = await supabase
        .from('chamados')
        .insert({
          company_id: currentCompany.id,
          os_numero: formData.os_numero,
          os_data: formData.os_data || null,
          distrito: formData.distrito || null,
          nome_gt: formData.nome_gt || null,
          cliente_codigo: formData.cliente_codigo || null,
          cliente_nome: formData.cliente_nome || null,
          tra_nome: formData.tra_nome || null,
          observacao: formData.observacao || null,
          status: formData.status,
          imported_from: 'manual',
          imported_by: userId,
        });
      
      if (error) throw error;
      
      toast.success("Chamado criado com sucesso!");
      navigate("/chamados");
    } catch (error: any) {
      toast.error("Erro ao criar chamado: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chamados")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Chamado</h1>
          <p className="text-muted-foreground">
            Cadastre um novo chamado manualmente
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do Chamado</CardTitle>
            <CardDescription>
              Preencha as informações do chamado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="os_numero">Número da OS *</Label>
                <Input
                  id="os_numero"
                  value={formData.os_numero}
                  onChange={(e) => setFormData({ ...formData, os_numero: e.target.value })}
                  placeholder="Ex: 12345"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os_data">Data da OS</Label>
                <Input
                  id="os_data"
                  type="date"
                  value={formData.os_data}
                  onChange={(e) => setFormData({ ...formData, os_data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distrito">Distrito</Label>
                <Input
                  id="distrito"
                  value={formData.distrito}
                  onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                  placeholder="Ex: 08"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_gt">Nome GT</Label>
                <Input
                  id="nome_gt"
                  value={formData.nome_gt}
                  onChange={(e) => setFormData({ ...formData, nome_gt: e.target.value })}
                  placeholder="Nome do técnico responsável"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_codigo">Código do Cliente</Label>
                <Input
                  id="cliente_codigo"
                  value={formData.cliente_codigo}
                  onChange={(e) => setFormData({ ...formData, cliente_codigo: e.target.value })}
                  placeholder="Código do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_nome">Nome do Cliente</Label>
                <Input
                  id="cliente_nome"
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  placeholder="Nome ou unidade de atendimento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tra_nome">Nome do TRA</Label>
                <Input
                  id="tra_nome"
                  value={formData.tra_nome}
                  onChange={(e) => setFormData({ ...formData, tra_nome: e.target.value })}
                  placeholder="Nome do TRA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_agendamento">Aguardando agendamento</SelectItem>
                    <SelectItem value="agendado">Agendado - ag atendimento</SelectItem>
                    <SelectItem value="ag_retorno">Ag retorno</SelectItem>
                    <SelectItem value="atendido_ag_fechamento">Atendido - Ag fechamento</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Observações sobre o chamado..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Chamado
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/chamados")}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
