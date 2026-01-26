import { useState, useEffect } from "react";
import { Upload, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalCompanySettings, useProposals } from "@/hooks/useProposals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PropostaTabConfigProps {
  settings: ProposalCompanySettings | null | undefined;
}

export function PropostaTabConfig({ settings }: PropostaTabConfigProps) {
  const { saveCompanySettings } = useProposals();
  const [localSettings, setLocalSettings] = useState<Partial<ProposalCompanySettings>>(
    settings || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleFieldChange = (field: keyof ProposalCompanySettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logos/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("proposals")
        .getPublicUrl(fileName);

      handleFieldChange("logo_url", urlData.publicUrl);
      toast.success("Logo enviado!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar logo");
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `covers/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("proposals")
        .getPublicUrl(fileName);

      handleFieldChange("cover_image_url", urlData.publicUrl);
      toast.success("Imagem de capa enviada!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar imagem de capa");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCompanySettings.mutateAsync(localSettings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Configurações da Empresa</h3>
          <p className="text-sm text-muted-foreground">
            Personalize as informações que aparecem nas propostas
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade">Identidade Visual</TabsTrigger>
          <TabsTrigger value="dados">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo Institucional</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo e Capa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Logo da Empresa</Label>
                  {localSettings.logo_url && (
                    <div className="w-32 h-32 border rounded-lg overflow-hidden">
                      <img
                        src={localSettings.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Logo
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label>Imagem de Capa (Página 1)</Label>
                  {localSettings.cover_image_url && (
                    <div className="w-full h-32 border rounded-lg overflow-hidden">
                      <img
                        src={localSettings.cover_image_url}
                        alt="Capa"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    id="cover-upload"
                    accept="image/*"
                    onChange={handleUploadCover}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("cover-upload")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Imagem de Capa
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localSettings.primary_color || "#16a34a"}
                      onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={localSettings.primary_color || "#16a34a"}
                      onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                      placeholder="#16a34a"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localSettings.secondary_color || "#15803d"}
                      onChange={(e) => handleFieldChange("secondary_color", e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={localSettings.secondary_color || "#15803d"}
                      onChange={(e) => handleFieldChange("secondary_color", e.target.value)}
                      placeholder="#15803d"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input
                    value={localSettings.razao_social || ""}
                    onChange={(e) => handleFieldChange("razao_social", e.target.value)}
                    placeholder="WeDo Serviços Técnicos Industriais e Comerciais"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={localSettings.cnpj || ""}
                    onChange={(e) => handleFieldChange("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={localSettings.endereco || ""}
                  onChange={(e) => handleFieldChange("endereco", e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF, CEP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={localSettings.telefone || ""}
                    onChange={(e) => handleFieldChange("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={localSettings.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome para Assinatura</Label>
                  <Input
                    value={localSettings.nome_assinatura || ""}
                    onChange={(e) => handleFieldChange("nome_assinatura", e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={localSettings.cargo_assinatura || ""}
                    onChange={(e) => handleFieldChange("cargo_assinatura", e.target.value)}
                    placeholder="Diretor Comercial"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conteudo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Textos Institucionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto Institucional</Label>
                <Textarea
                  value={localSettings.texto_institucional || ""}
                  onChange={(e) => handleFieldChange("texto_institucional", e.target.value)}
                  placeholder="Apresentação da empresa..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Missão</Label>
                <Textarea
                  value={localSettings.missao || ""}
                  onChange={(e) => handleFieldChange("missao", e.target.value)}
                  placeholder="Nossa missão é..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Visão</Label>
                <Textarea
                  value={localSettings.visao || ""}
                  onChange={(e) => handleFieldChange("visao", e.target.value)}
                  placeholder="Nossa visão é..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Valores</Label>
                <Textarea
                  value={localSettings.valores || ""}
                  onChange={(e) => handleFieldChange("valores", e.target.value)}
                  placeholder="• Segurança&#10;• Pessoas&#10;• Qualidade..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Diferenciais</Label>
                <Textarea
                  value={localSettings.diferenciais || ""}
                  onChange={(e) => handleFieldChange("diferenciais", e.target.value)}
                  placeholder="Nossos diferenciais..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposta" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prefixo do Número</Label>
                  <Input
                    value={localSettings.prefixo_numero || "P"}
                    onChange={(e) => handleFieldChange("prefixo_numero", e.target.value)}
                    placeholder="P"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Próximo Número</Label>
                  <Input
                    type="number"
                    value={localSettings.proximo_numero || 1}
                    onChange={(e) => handleFieldChange("proximo_numero", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade Padrão (dias)</Label>
                  <Input
                    type="number"
                    value={localSettings.validade_dias_padrao || 10}
                    onChange={(e) => handleFieldChange("validade_dias_padrao", parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
