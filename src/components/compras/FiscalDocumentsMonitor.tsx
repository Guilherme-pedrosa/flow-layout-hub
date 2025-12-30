import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Truck, 
  RefreshCw, 
  Search, 
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Import
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { AIBanner } from "@/components/shared/AIBanner";

interface FiscalDocument {
  id: string;
  chave_nfe: string;
  numero: string;
  serie: string;
  tipo: string;
  status: string;
  valor_total: number;
  data_emissao: string;
  destinatario_nome: string;
  destinatario_cpf_cnpj: string;
  status_sefaz: string;
}

export function FiscalDocumentsMonitor() {
  const { currentCompany } = useCompany();
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("nfe");

  useEffect(() => {
    if (currentCompany?.id) {
      fetchDocuments();
    }
  }, [currentCompany?.id, activeTab]);

  const fetchDocuments = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("tipo", activeTab === "nfe" ? "NFe" : "CTe")
        .order("data_emissao", { ascending: false })
        .limit(100);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast.error("Erro ao carregar documentos fiscais");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Simular sincronização com SEFAZ
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Documentos sincronizados com sucesso!");
      fetchDocuments();
    } catch (error) {
      toast.error("Erro ao sincronizar documentos");
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = (doc: FiscalDocument) => {
    toast.info(`Importando NF-e ${doc.numero}...`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      autorizada: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      pendente: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      rejeitada: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
      cancelada: { variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.pendente;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc =>
    doc.numero?.includes(search) ||
    doc.chave_nfe?.includes(search) ||
    doc.destinatario_nome?.toLowerCase().includes(search.toLowerCase())
  );

  // Estatísticas
  const stats = {
    total: documents.length,
    autorizadas: documents.filter(d => d.status === "autorizada").length,
    pendentes: documents.filter(d => d.status === "pendente").length,
    valorTotal: documents.reduce((sum, d) => sum + (d.valor_total || 0), 0),
  };

  return (
    <div className="space-y-6">
      <AIBanner
        insights={[{
          id: "fiscal-monitor",
          message: "Acompanhe automaticamente os documentos fiscais recebidos da sua empresa. O sistema identifica novas NF-e/CT-e e sugere a importação automática.",
          type: "info"
        }]}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Autorizadas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.autorizadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(stats.valorTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs NF-e / CT-e */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="nfe" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              NF-e Recebidas
            </TabsTrigger>
            <TabsTrigger value="cte" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              CT-e Recebidos
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        <TabsContent value="nfe" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número/Série</TableHead>
                      <TableHead>Emitente</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum documento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="font-medium">{doc.numero}/{doc.serie}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {doc.chave_nfe}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{doc.destinatario_nome || "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.destinatario_cpf_cnpj}
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.data_emissao 
                              ? new Date(doc.data_emissao).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(doc.valor_total || 0)}
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleImport(doc)}
                              >
                                <Import className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cte" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Monitoramento de CT-e será ativado em breve.</p>
              <p className="text-sm mt-2">Configure a integração com transportadoras para visualizar CT-e recebidos.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
