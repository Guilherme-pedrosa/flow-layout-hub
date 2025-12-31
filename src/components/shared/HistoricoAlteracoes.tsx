import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HistoricoItem {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  usuario_nome?: string;
}

interface HistoricoAlteracoesProps {
  entityId: string | undefined;
  entityType: "cliente" | "produto" | "usuario" | "empresa";
}

const CAMPO_LABELS: Record<string, string> = {
  razao_social: "Razão Social",
  nome_fantasia: "Nome Fantasia",
  cpf_cnpj: "CPF/CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  status: "Status",
  logradouro: "Logradouro",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "Estado",
  cep: "CEP",
  inscricao_estadual: "Inscrição Estadual",
  inscricao_municipal: "Inscrição Municipal",
  regime_tributario: "Regime Tributário",
  tipo_cliente: "Tipo de Cliente",
  limite_credito: "Limite de Crédito",
  observacoes_comerciais: "Observações Comerciais",
  observacoes_fiscais: "Observações Fiscais",
  observacoes_internas: "Observações Internas",
  // Adicione mais campos conforme necessário
};

export function HistoricoAlteracoes({ entityId, entityType }: HistoricoAlteracoesProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);

  useEffect(() => {
    if (entityId) {
      loadHistorico();
      loadEntityInfo();
    } else {
      setLoading(false);
    }
  }, [entityId, entityType]);

  const loadEntityInfo = async () => {
    if (!entityId) return;

    try {
      if (entityType === "cliente") {
        // Usar tabela unificada pessoas
        const { data } = await supabase
          .from("pessoas")
          .select("created_at, created_by")
          .eq("id", entityId)
          .single();

        if (data) {
          setCreatedAt(data.created_at);
          // Buscar nome do usuário que criou
          if (data.created_by) {
            const { data: userData } = await supabase
              .from("users")
              .select("name")
              .eq("id", data.created_by)
              .single();
            setCreatedBy(userData?.name || null);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar informações da entidade:", error);
    }
  };

  const loadHistorico = async () => {
    if (!entityId) return;

    setLoading(true);
    try {
      if (entityType === "cliente") {
        const { data, error } = await supabase
          .from("cliente_historico")
          .select(`
            id,
            campo_alterado,
            valor_anterior,
            valor_novo,
            created_at,
            usuario_id
          `)
          .eq("cliente_id", entityId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Buscar nomes dos usuários
        const historicoComNomes = await Promise.all(
          (data || []).map(async (item) => {
            let usuario_nome = "Sistema";
            if (item.usuario_id) {
              const { data: userData } = await supabase
                .from("users")
                .select("name")
                .eq("id", item.usuario_id)
                .single();
              usuario_nome = userData?.name || "Usuário";
            }
            return { ...item, usuario_nome };
          })
        );

        setHistorico(historicoComNomes);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCampoLabel = (campo: string) => {
    return CAMPO_LABELS[campo] || campo;
  };

  if (!entityId) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Informação de criação */}
        {createdAt && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Criado em: {formatDate(createdAt)}</span>
            </div>
            {createdBy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Por: {createdBy}</span>
              </div>
            )}
          </div>
        )}

        {/* Lista de alterações */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Carregando histórico...
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhuma alteração registrada
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {historico.map((item) => (
                <div
                  key={item.id}
                  className="border-l-2 border-primary/30 pl-3 py-1"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {getCampoLabel(item.campo_alterado)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">De: </span>
                    <span className="line-through text-muted-foreground">
                      {item.valor_anterior || "(vazio)"}
                    </span>
                    <span className="text-muted-foreground"> → Para: </span>
                    <span className="font-medium">
                      {item.valor_novo || "(vazio)"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.usuario_nome}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
