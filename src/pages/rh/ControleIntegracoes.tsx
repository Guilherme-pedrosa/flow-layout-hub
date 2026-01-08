import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRhColaboradores, useRhDocumentos, useRhIntegracoes, getStatusDocumento } from "@/hooks/useRh";
import { useClientes } from "@/hooks/useClientes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Users, Building2, ArrowRight, FileText } from "lucide-react";

export default function RhControleIntegracoes() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const { colaboradores } = useRhColaboradores();
  const { todosDocumentos } = useRhDocumentos();
  const { integracoes } = useRhIntegracoes();
  const { fetchClientes } = useClientes();
  const [clientes, setClientes] = useState<any[]>([]);
  
  useState(() => {
    fetchClientes().then(setClientes);
  });

  const getStatusIntegracao = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { label: "Vencida", color: "bg-red-100 text-red-800 border-red-300" };
    if (diffDias <= 30) return { label: "Vencendo", color: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    return { label: "OK", color: "bg-green-100 text-green-800 border-green-300" };
  };

  const documentosVencendoOuVencidos = useMemo(() => {
    return todosDocumentos?.filter((doc) => {
      if (!doc.data_vencimento) return false;
      const status = getStatusDocumento(doc.data_vencimento);
      return status && (status.label === "Vencido" || status.label === "Vencendo");
    }) || [];
  }, [todosDocumentos]);

  const integracoesVencendoOuVencidas = useMemo(() => {
    return integracoes?.filter((int) => {
      const status = getStatusIntegracao(int.data_vencimento);
      return status.label !== "OK";
    }) || [];
  }, [integracoes]);

  const getColaboradorNome = (id: string) => {
    return colaboradores?.find((c) => c.id === id)?.nome || "-";
  };

  const getClienteNome = (id: string) => {
    const cliente = clientes?.find((c) => c.id === id);
    return cliente?.nome_fantasia || cliente?.razao_social || "-";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Integrações</h1>
          <p className="text-muted-foreground">Visão geral do sistema - clique nos itens para gerenciar</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/rh/colaboradores")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{colaboradores?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Clique para gerenciar</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/clientes")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Clique para gerenciar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integracoes?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {integracoesVencendoOuVencidas.length > 0 && (
                <span className="text-yellow-600">{integracoesVencendoOuVencidas.length} requerem atenção</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {documentosVencendoOuVencidos.length + integracoesVencendoOuVencidas.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendentes de atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="visao-geral" className="space-y-4" onValueChange={setAbaAtiva}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Críticos</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        {/* Aba Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos que Requerem Atenção</CardTitle>
              <CardDescription>
                Documentos vencidos ou vencendo em até 30 dias - clique no técnico para renovar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentosVencendoOuVencidos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>Todos os documentos estão em dia!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosVencendoOuVencidos.map((doc) => {
                      const status = getStatusDocumento(doc.data_vencimento);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{getColaboradorNome(doc.colaborador_id)}</TableCell>
                          <TableCell>{doc.tipo_documento}</TableCell>
                          <TableCell>{new Date(doc.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            {status && (
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => navigate("/rh/colaboradores")}>
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Renovar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrações que Requerem Atenção</CardTitle>
              <CardDescription>
                Integrações vencidas ou vencendo em até 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integracoesVencendoOuVencidas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>Todas as integrações estão em dia!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Data Integração</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integracoesVencendoOuVencidas.map((int) => {
                      const status = getStatusIntegracao(int.data_vencimento);
                      return (
                        <TableRow key={int.id}>
                          <TableCell className="font-medium">{getColaboradorNome(int.colaborador_id)}</TableCell>
                          <TableCell>{getClienteNome(int.cliente_id)}</TableCell>
                          <TableCell>{new Date(int.data_integracao).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{new Date(int.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
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

        {/* Aba Documentos Críticos */}
        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Documentos Críticos</CardTitle>
              <CardDescription>
                Lista completa de documentos que precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentosVencendoOuVencidos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>Nenhum documento crítico no momento!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosVencendoOuVencidos.map((doc) => {
                      const status = getStatusDocumento(doc.data_vencimento);
                      const hoje = new Date();
                      const vencimento = new Date(doc.data_vencimento);
                      const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{getColaboradorNome(doc.colaborador_id)}</TableCell>
                          <TableCell>{doc.tipo_documento}</TableCell>
                          <TableCell>{new Date(doc.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            {diffDias < 0 ? (
                              <span className="text-red-600 font-medium">Vencido há {Math.abs(diffDias)} dias</span>
                            ) : (
                              <span className="text-yellow-600 font-medium">Vence em {diffDias} dias</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {status && (
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => navigate("/rh/colaboradores")}>
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Ir para Técnico
                            </Button>
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

        {/* Aba Integrações */}
        <TabsContent value="integracoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Integrações Ativas</CardTitle>
              <CardDescription>
                {integracoes?.length || 0} integração(ões) ativa(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!integracoes || integracoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p>Nenhuma integração cadastrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Técnico</TableHead>
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
                          <TableCell className="font-medium">{getColaboradorNome(int.colaborador_id)}</TableCell>
                          <TableCell>{getClienteNome(int.cliente_id)}</TableCell>
                          <TableCell>{new Date(int.data_integracao).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{new Date(int.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
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
