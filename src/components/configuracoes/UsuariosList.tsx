import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Loader2, Edit, Search, Eye, EyeOff } from "lucide-react";
import { useSystemUsers, SystemUser } from "@/hooks/useConfiguracoes";
import { useCompany } from "@/contexts/CompanyContext";
import { formatDate } from "@/lib/formatters";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type UserRole = Database["public"]["Enums"]["user_role"];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  operador: "Operador",
  tecnico: "Técnico",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoque: "Estoque",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-destructive/20 text-destructive border-destructive/30",
  financeiro: "bg-info/20 text-info border-info/30",
  operador: "bg-success/20 text-success border-success/30",
  tecnico: "bg-warning/20 text-warning border-warning/30",
  gerente: "bg-primary/20 text-primary border-primary/30",
  vendedor: "bg-accent/20 text-accent-foreground border-accent/30",
  estoque: "bg-muted text-muted-foreground border-border",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acesso total ao sistema",
  financeiro: "Contas a pagar/receber, relatórios",
  operador: "Operações básicas",
  tecnico: "Técnico de OS - aparece nas ordens de serviço",
  gerente: "Gerência e aprovações",
  vendedor: "Vendas e clientes - vendedor da OS",
  estoque: "Checkin, checkout, movimentações",
};

export function UsuariosList() {
  const { loading, fetchUsers, createUser, updateUser, toggleUserStatus } = useSystemUsers();
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "operador" as UserRole,
  });

  useEffect(() => {
    loadData();
  }, [currentCompany?.id]);

  const loadData = async () => {
    const usersData = await fetchUsers();
    setUsers(usersData);
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenDialog = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Não preenche senha ao editar
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "operador" });
    }
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompany?.id) return;

    // Validações
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: "Erro", description: "E-mail é obrigatório", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Erro", description: "Senha é obrigatória para novos usuários", variant: "destructive" });
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setSavingAuth(true);

    try {
      if (editingUser) {
        // Atualizar usuário existente
        const result = await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        });
        if (result) {
          setIsDialogOpen(false);
          loadData();
        }
      } else {
        // Criar novo usuário com autenticação Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.name,
            }
          }
        });

        if (authError) {
          if (authError.message.includes("already registered")) {
            toast({
              title: "E-mail já cadastrado",
              description: "Este e-mail já está sendo usado por outro usuário.",
              variant: "destructive",
            });
          } else {
            throw authError;
          }
          return;
        }

        if (authData.user) {
          // Atualizar o usuário criado pelo trigger com os dados corretos
          const { error: updateError } = await supabase
            .from("users")
            .update({
              name: formData.name,
              role: formData.role,
              company_id: currentCompany.id,
            })
            .eq("auth_id", authData.user.id);

          if (updateError) {
            console.error("Erro ao atualizar usuário:", updateError);
          }

          // Vincular à empresa
          const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", authData.user.id)
            .single();

          if (userData) {
            await supabase
              .from("user_companies")
              .upsert({
                user_id: userData.id,
                company_id: currentCompany.id,
                role: formData.role === "admin" ? "admin" : "member",
                is_default: true,
              }, { onConflict: "user_id,company_id" });
          }

          toast({
            title: "Usuário criado",
            description: "O usuário foi cadastrado com sucesso. Um e-mail de confirmação foi enviado.",
          });
          setIsDialogOpen(false);
          loadData();
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingAuth(false);
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const result = await toggleUserStatus(user.id, !user.is_active);
    if (result) loadData();
  };

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Altere os dados do usuário"
                  : "Preencha os dados do novo usuário para criar acesso ao sistema"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail (login) *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado após o cadastro
                  </p>
                )}
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de acesso *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex flex-col">
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS[value as UserRole]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading || savingAuth}>
                {(loading || savingAuth) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingUser ? "Salvar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => handleToggleStatus(user)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
