import { useState } from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProposalTerm, useProposals } from "@/hooks/useProposals";

interface PropostaTabTermosProps {
  proposalId: string;
  terms: ProposalTerm[];
  onChange: (terms: ProposalTerm[]) => void;
}

// Templates padrão de termos
const defaultTermTemplates = [
  {
    chave: "inicio_fornecimento",
    titulo: "Início do Fornecimento",
    conteudo: "O fornecimento do serviço desta proposta terá início na data acordada, e terá vigência por 12 (doze) meses, podendo ser prorrogado de comum acordo entre as partes.",
  },
  {
    chave: "turno_trabalho",
    titulo: "Turno de Trabalho",
    conteudo: "O turno de trabalho será de segunda a sexta-feira, em horário comercial. Condições que diferem destes termos terão que ser alinhadas entre as partes.",
  },
  {
    chave: "horas_extras",
    titulo: "Horas Extraordinárias / Adicional Noturno",
    conteudo: "Caso seja necessário a realização de visitas emergenciais, a visita subsequente poderá ser adiantada. Caso não seja possível, deverá haver uma negociação prévia para a execução de tal serviço.",
  },
  {
    chave: "escopo_tecnico",
    titulo: "Escopo Técnico",
    conteudo: "Elaboração de manutenção preventiva mensal, com todas as revisões e procedimentos com o intuito de manter os equipamentos em devidas condições de uso.",
  },
  {
    chave: "diferenciais",
    titulo: "Diferenciais WeDo",
    conteudo: "Gestor de Operações dedicado, Supervisor de Manutenção, Engenheiro de Produção e Qualidade, e Assistente Administrativo para suporte completo.",
  },
  {
    chave: "fornecimento_empresa",
    titulo: "Fornecimento WeDo",
    conteudo: "• Acompanhamento de cada equipamento em contrato através de QR code\n• Peças originais, vendidas a preço competitivo\n• Profissionais devidamente registrados e treinados\n• Software de controle e lançamento em tempo real\n• Relatórios detalhados de cada serviço realizado",
  },
  {
    chave: "fornecimento_cliente",
    titulo: "Fornecimento por Parte do Cliente",
    conteudo: "• EPIs completos e em ótimas condições de uso\n• Uniformes completos\n• Refeições de acordo com o turno trabalhado\n• Água potável e banheiros\n• Acesso às instalações elétricas e hidráulicas",
  },
  {
    chave: "reajuste",
    titulo: "Reajuste de Preço",
    conteudo: "O Preço poderá ser reajustado anualmente conforme os índices IGPM da FGV e IPCA do IBGE ou por outro índice oficial que venha a substituí-lo, ou conforme alinhamento com o cliente.",
  },
];

export function PropostaTabTermos({ proposalId, terms, onChange }: PropostaTabTermosProps) {
  const { saveProposalTerms } = useProposals();
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTerm = (template?: typeof defaultTermTemplates[0]) => {
    const newTerm: Partial<ProposalTerm> = {
      id: `temp-${Date.now()}`,
      proposal_id: proposalId,
      chave: template?.chave || `custom_${Date.now()}`,
      titulo: template?.titulo || "Novo Termo",
      conteudo: template?.conteudo || "",
      habilitado: true,
      ordem: terms.length,
    };
    onChange([...terms, newTerm as ProposalTerm]);
  };

  const handleRemoveTerm = (index: number) => {
    onChange(terms.filter((_, i) => i !== index));
  };

  const handleTermChange = (index: number, field: keyof ProposalTerm, value: any) => {
    const newTerms = [...terms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    onChange(newTerms);
  };

  const handleLoadTemplates = () => {
    const newTerms = defaultTermTemplates.map((template, index) => ({
      id: `temp-${Date.now()}-${index}`,
      proposal_id: proposalId,
      ...template,
      habilitado: true,
      ordem: index,
    }));
    onChange(newTerms as ProposalTerm[]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProposalTerms.mutateAsync({
        proposalId,
        terms: terms.map(({ id, ...rest }) => ({
          ...rest,
          ...(id.startsWith("temp-") ? {} : { id }),
        })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Termos e Condições</h3>
          <p className="text-sm text-muted-foreground">
            Configure os termos que aparecerão na proposta
          </p>
        </div>
        <div className="flex gap-2">
          {terms.length === 0 && (
            <Button variant="outline" onClick={handleLoadTemplates}>
              Carregar Termos Padrão
            </Button>
          )}
          <Button variant="outline" onClick={() => handleAddTerm()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Termo
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Termos"}
          </Button>
        </div>
      </div>

      {terms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Nenhum termo configurado</h3>
            <p className="text-muted-foreground mb-4">
              Carregue os termos padrão ou adicione termos personalizados
            </p>
            <Button variant="outline" onClick={handleLoadTemplates}>
              Carregar Termos Padrão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {terms.map((term, index) => (
            <Card key={term.id || index} className={!term.habilitado ? "opacity-50" : ""}>
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  <div className="flex items-start pt-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Chave</Label>
                          <Input
                            value={term.chave}
                            onChange={(e) => handleTermChange(index, "chave", e.target.value)}
                            placeholder="identificador_unico"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Título</Label>
                          <Input
                            value={term.titulo}
                            onChange={(e) => handleTermChange(index, "titulo", e.target.value)}
                            placeholder="Título do termo"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={term.habilitado}
                            onCheckedChange={(v) => handleTermChange(index, "habilitado", v)}
                          />
                          <Label className="text-sm">
                            {term.habilitado ? "Visível" : "Oculto"}
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Conteúdo</Label>
                      <Textarea
                        value={term.conteudo}
                        onChange={(e) => handleTermChange(index, "conteudo", e.target.value)}
                        placeholder="Conteúdo do termo..."
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTerm(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
