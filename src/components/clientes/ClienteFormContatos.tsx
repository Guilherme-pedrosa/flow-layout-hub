import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, User } from "lucide-react";
import { formatTelefone } from "@/lib/formatters";

export interface Contato {
  id?: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  principal: boolean;
}

interface ClienteFormContatosProps {
  contatos: Contato[];
  setContatos: (contatos: Contato[]) => void;
}

export function ClienteFormContatos({ contatos, setContatos }: ClienteFormContatosProps) {
  const handleAddContato = () => {
    setContatos([
      ...contatos,
      { nome: '', cargo: '', telefone: '', email: '', principal: contatos.length === 0 },
    ]);
  };

  const handleRemoveContato = (index: number) => {
    const newContatos = contatos.filter((_, i) => i !== index);
    // Se removeu o principal, marca o primeiro como principal
    if (newContatos.length > 0 && !newContatos.some(c => c.principal)) {
      newContatos[0].principal = true;
    }
    setContatos(newContatos);
  };

  const handleChangeContato = (index: number, field: keyof Contato, value: any) => {
    const newContatos = [...contatos];
    
    // Se marcou como principal, desmarca os outros
    if (field === 'principal' && value === true) {
      newContatos.forEach((c, i) => {
        c.principal = i === index;
      });
    } else {
      (newContatos[index] as any)[field] = value;
    }
    
    setContatos(newContatos);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Contatos do Cliente</h3>
          <p className="text-sm text-muted-foreground">
            Adicione os contatos relacionados a este cliente
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleAddContato}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Contato
        </Button>
      </div>

      {contatos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum contato cadastrado.<br />
              Clique em "Adicionar Contato" para incluir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contatos.map((contato, index) => (
            <Card key={index} className={contato.principal ? 'border-primary' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`principal-${index}`}
                      checked={contato.principal}
                      onCheckedChange={(checked) => handleChangeContato(index, 'principal', checked)}
                    />
                    <Label htmlFor={`principal-${index}`} className="cursor-pointer">
                      Contato Principal
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveContato(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`nome-${index}`}>Nome</Label>
                    <Input
                      id={`nome-${index}`}
                      value={contato.nome}
                      onChange={(e) => handleChangeContato(index, 'nome', e.target.value)}
                      placeholder="Nome do contato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`cargo-${index}`}>Cargo</Label>
                    <Input
                      id={`cargo-${index}`}
                      value={contato.cargo}
                      onChange={(e) => handleChangeContato(index, 'cargo', e.target.value)}
                      placeholder="Cargo ou função"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`telefone-${index}`}>Telefone</Label>
                    <Input
                      id={`telefone-${index}`}
                      value={formatTelefone(contato.telefone)}
                      onChange={(e) => handleChangeContato(index, 'telefone', e.target.value.replace(/\D/g, ''))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`email-${index}`}>E-mail</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={contato.email}
                      onChange={(e) => handleChangeContato(index, 'email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
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
