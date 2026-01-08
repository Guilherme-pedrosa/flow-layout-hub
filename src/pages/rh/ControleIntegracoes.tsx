import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePessoas } from "@/hooks/usePessoas";
import { useRh, useRhIntegracoes, getStatusDocumento } from "@/hooks/useRh";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Users, Building2, ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared";

export default function RhControleIntegracoes() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const { colaboradores, clientes } = usePessoas();
  const { documentos } = useRh();
  const { integracoes } = useRhIntegracoes();

  const getStatusIntegracao = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { label: "Vencida", color: "bg-red-100 text-red-800 border-red-300" };
    if (diffDias <= 30) return { label: "Vencendo", color: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    return { label: "OK", color: "bg-green-100 text-green-800 border-green-300" };
  };

  const documentosVencendoOuVencidos = useMemo(() => {
    return documentos?.filter((doc) => {
      if (!doc.data_vencimento) return false;
      const status = getStatusDocumento(doc.data_vencimento);
      return status && (status.label === "Vencido" || status.label === "Vencendo");
    }) || [];
  }, [documentos]);

  const integracoesVencendoOuVencidas = useMemo(() => {
    return integracoes?.filter((int) => {
      const status = getStatusIntegracao(int.data_vencimento);
      return status.label !== "OK";
    }) || [];
  }, [integracoes]);

  const colaboradoresAtivos = colaboradores.filter(c => c.is_active);
  const clientesAtivos = clientes.filter(c => c.is_active);

  // Encontrar colaborador por ID
  const getColaboradorNome = (id: string) => {
    const colab = colaboradores.find(c => c.id === id);
    return colab?.nome_fantasia || colab?.razao_social || "N/A";
  };

  // Encontrar cliente por ID
  const getClienteNome = (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    return cliente?.nome_fantasia || cliente?.razao_social || "N/A";
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Controle de Integrações"
        description="Visão geral de colaboradores, documentos e integrações"
        breadcrumbs={[
          { label: "RH" },
          { label: "Controle Integrações" },
        ]}
      />

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="mt-6">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Críticos</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Colaboradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{colaboradoresAtivos.length}</div>
                <p className="text-xs text-muted-foreground">ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Unidades (Clientes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientesAtivos.length}</div>
                <p className="text-xs text-muted-foreground">ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Integrações Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{integracoes.length}</div>
                <p className="text-xs text-muted-foreground">registradas</p>
              </CardContent>
            </Card>

            <Card className={documentosVencendoOuVencidos.length > 0 ? "border-red-300" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {documentosVencendoOuVencidos.length + integracoesVencendoOuVencidas.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {documentosVencendoOuVencidos.length} docs + {integracoesVencendoOuVencidas.length} integ.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Links rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/rh/colaboradores")}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Gerenciar Colaboradores
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Cadastrar e editar colaboradores e seus documentos</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setAbaAtiva("integracoes")}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Matriz de Integrações
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Visualizar integrações colaborador x unidade</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Críticos
              </CardTitle>
              <CardDescription>
                Documentos vencidos ou vencendo nos próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentosVencendoOuVencidos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhum documento crítico</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosVencendoOuVencidos.map((doc) => {
                      const status = getStatusDocumento(doc.data_vencimento);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>{getColaboradorNome(doc.colaborador_id)}</TableCell>
                          <TableCell>{doc.tipo_documento}</TableCell>
                          <TableCell>
                            {doc.data_vencimento
                              ? new Date(doc.data_vencimento).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {status && (
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Integrações Registradas
              </CardTitle>
              <CardDescription>
                Registro de integrações colaborador x unidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integracoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma integração registrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Data Integração</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integracoes.map((int) => {
                      const status = getStatusIntegracao(int.data_vencimento);
                      return (
                        <TableRow key={int.id}>
                          <TableCell>{getColaboradorNome(int.colaborador_id)}</TableCell>
                          <TableCell>{getClienteNome(int.cliente_id)}</TableCell>
                          <TableCell>
                            {new Date(int.data_integracao).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {new Date(int.data_vencimento).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
