import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SupplierFormContatosProps {
  pessoaId?: string;
}

interface Contato {
  id: string;
  pessoa_id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  principal: boolean;
}

interface ContatoLocal {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  principal: boolean;
}

export function SupplierFormContatos({ pessoaId }: SupplierFormContatosProps) {
  const queryClient = useQueryClient();
  
  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["pessoa-contatos", pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      const { data, error } = await supabase
        .from("pessoa_contatos")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("principal", { ascending: false });

      if (error) throw error;
      return data as Contato[];
    },
    enabled: !!pessoaId,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContatoLocal>({
    nome: "",
    email: "",
    telefone: "",
    cargo: "",
    principal: false,
  });

  const createContato = useMutation({
    mutationFn: async (data: ContatoLocal & { pessoa_id: string }) => {
      if (data.principal) {
        await supabase
          .from("pessoa_contatos")
          .update({ principal: false })
          .eq("pessoa_id", data.pessoa_id);
      }
      const { error } = await supabase.from("pessoa_contatos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-contatos", pessoaId] });
      toast.success("Contato adicionado!");
    },
  });

  const updateContato = useMutation({
    mutationFn: async ({ id, ...data }: ContatoLocal & { id: string }) => {
      if (data.principal && pessoaId) {
        await supabase
          .from("pessoa_contatos")
          .update({ principal: false })
          .eq("pessoa_id", pessoaId)
          .neq("id", id);
      }
      const { error } = await supabase
        .from("pessoa_contatos")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-contatos", pessoaId] });
      toast.success("Contato atualizado!");
    },
  });

  const deleteContato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pessoa_contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-contatos", pessoaId] });
      toast.success("Contato removido!");
    },
  });

  const resetForm = () => {
    setFormData({ nome: "", email: "", telefone: "", cargo: "", principal: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!pessoaId) return;
    
    if (editingId) {
      await updateContato.mutateAsync({ id: editingId, ...formData });
    } else {
      await createContato.mutateAsync({ pessoa_id: pessoaId, ...formData });
    }
    resetForm();
  };

  const handleEdit = (contato: Contato) => {
    setFormData({
      nome: contato.nome || "",
      email: contato.email || "",
      telefone: contato.telefone || "",
      cargo: contato.cargo || "",
      principal: contato.principal,
    });
    setEditingId(contato.id);
    setShowForm(true);
  };

  if (!pessoaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Salve o fornecedor primeiro para adicionar contatos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Contatos</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Contato
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Editar Contato" : "Novo Contato"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="contato_principal"
                checked={formData.principal}
                onCheckedChange={(checked) => setFormData({ ...formData, principal: !!checked })}
              />
              <Label htmlFor="contato_principal" className="cursor-pointer">Contato Principal</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {contatos.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatos.map((contato) => (
                  <TableRow key={contato.id}>
                    <TableCell>{contato.nome || "-"}</TableCell>
                    <TableCell>{contato.cargo || "-"}</TableCell>
                    <TableCell>{contato.email || "-"}</TableCell>
                    <TableCell>{contato.telefone || "-"}</TableCell>
                    <TableCell className="text-center">
                      {contato.principal ? "✓" : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(contato)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteContato.mutateAsync(contato.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {contatos.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum contato cadastrado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
