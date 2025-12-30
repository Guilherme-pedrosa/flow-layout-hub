import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Upload, Key, FileKey, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

interface InterCredentials {
  id: string;
  client_id: string;
  certificate_file_path: string;
  private_key_file_path: string;
  account_number: string | null;
  is_active: boolean;
  last_sync_at: string | null;
}

export default function ConfiguracaoBancaria() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<InterCredentials | null>(null);
  
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentCompany?.id) {
      loadCredentials();
    }
  }, [currentCompany?.id]);

  const loadCredentials = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inter_credentials")
        .select("id, client_id, certificate_file_path, private_key_file_path, account_number, is_active, last_sync_at")
        .eq("company_id", currentCompany.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCredentials(data);
        setClientId(data.client_id);
        setAccountNumber(data.account_number || "");
      } else {
        // Reset form when switching to a company without credentials
        setCredentials(null);
        setClientId("");
        setAccountNumber("");
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa");
      return;
    }

    if (!clientId || !clientSecret) {
      toast.error("Preencha o Client ID e Client Secret");
      return;
    }

    if (!accountNumber) {
      toast.error("O número da conta corrente é obrigatório");
      return;
    }

    if (!credentials && (!certFile || !keyFile)) {
      toast.error("Faça upload do certificado e da chave privada");
      return;
    }

    setSaving(true);

    try {
      let certPath = credentials?.certificate_file_path || "";
      let keyPath = credentials?.private_key_file_path || "";

      // Upload do certificado se fornecido
      if (certFile) {
        certPath = `${currentCompany.id}/cert.crt`;
        const { error: certError } = await supabase.storage
          .from("inter-certs")
          .upload(certPath, certFile, { upsert: true });

        if (certError) throw new Error(`Erro no upload do certificado: ${certError.message}`);
      }

      // Upload da chave privada se fornecida
      if (keyFile) {
        keyPath = `${currentCompany.id}/key.key`;
        const { error: keyError } = await supabase.storage
          .from("inter-certs")
          .upload(keyPath, keyFile, { upsert: true });

        if (keyError) throw new Error(`Erro no upload da chave: ${keyError.message}`);
      }

      // Salvar credenciais no banco
      const { error: dbError } = await supabase
        .from("inter_credentials")
        .upsert({
          company_id: currentCompany.id,
          client_id: clientId,
          client_secret: clientSecret,
          certificate_file_path: certPath,
          private_key_file_path: keyPath,
          account_number: accountNumber || null,
        }, { onConflict: "company_id" });

      if (dbError) throw dbError;

      toast.success("Configuração salva com sucesso!");
      setCertFile(null);
      setKeyFile(null);
      setClientSecret("");
      loadCredentials();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuração Bancária</h1>
        <p className="text-muted-foreground">
          Configure a integração com o Banco Inter para conciliação automática
        </p>
        {currentCompany && (
          <Badge variant="outline" className="mt-2">
            <Building2 className="h-3 w-3 mr-1" />
            {currentCompany.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              API Banco Inter
            </CardTitle>
            <CardDescription>
              Insira as credenciais de acesso à API do Banco Inter para <strong>{currentCompany?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Seu Client ID do Banco Inter"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">
                  Client Secret
                  {credentials && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (deixe em branco para manter o atual)
                    </span>
                  )}
                </Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={credentials ? "••••••••••••" : "Seu Client Secret"}
                  required={!credentials}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="flex items-center gap-2">
                  Número da Conta Corrente
                  <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                </Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ex: 12345678-9"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Número da conta corrente no Banco Inter (sem agência)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="certFile" className="flex items-center gap-2">
                  <FileKey className="h-4 w-4" />
                  Certificado Digital (.crt)
                  {credentials?.certificate_file_path && !certFile && (
                    <Badge variant="outline" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </Label>
                <Input
                  id="certFile"
                  type="file"
                  accept=".crt,.pem,.cer"
                  onChange={(e) => handleFileChange(e, setCertFile)}
                />
                {certFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {certFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyFile" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Chave Privada (.key)
                  {credentials?.private_key_file_path && !keyFile && (
                    <Badge variant="outline" className="ml-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </Label>
                <Input
                  id="keyFile"
                  type="file"
                  accept=".key,.pem"
                  onChange={(e) => handleFileChange(e, setKeyFile)}
                />
                {keyFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {keyFile.name}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={saving || !currentCompany}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {credentials ? "Atualizar Configuração" : "Salvar Configuração"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Status da Integração */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Integração</CardTitle>
            <CardDescription>
              Informações sobre a conexão com o Banco Inter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credentials ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Integração configurada</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <span className="font-mono">{credentials.client_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conta:</span>
                    <span>{credentials.account_number || "Não informada"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={credentials.is_active ? "default" : "secondary"}>
                      {credentials.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última sincronização:</span>
                    <span>
                      {credentials.last_sync_at
                        ? new Date(credentials.last_sync_at).toLocaleString("pt-BR")
                        : "Nunca"}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-2">Próximos passos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Acesse a tela de Conciliação Bancária</li>
                    <li>Selecione o período desejado</li>
                    <li>Clique em "Sincronizar" para importar o extrato</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Integração não configurada</p>
                <p className="text-sm text-muted-foreground">
                  Preencha as credenciais ao lado para habilitar a integração com <strong>{currentCompany?.name}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações sobre o Banco Inter */}
      <Card>
        <CardHeader>
          <CardTitle>Como obter as credenciais?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol className="space-y-2">
            <li>Acesse o <strong>Internet Banking do Banco Inter</strong></li>
            <li>Navegue até <strong>Menu &gt; Configurações &gt; API Banking</strong></li>
            <li>Crie uma nova aplicação ou selecione uma existente</li>
            <li>Gere o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
            <li>Baixe o <strong>Certificado Digital (.crt)</strong> e a <strong>Chave Privada (.key)</strong></li>
            <li>Faça upload dos arquivos e preencha as credenciais nesta página</li>
          </ol>
          <p className="text-muted-foreground mt-4">
            <strong>Importante:</strong> Mantenha suas credenciais em segurança. 
            Os arquivos de certificado são armazenados de forma segura e criptografada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
