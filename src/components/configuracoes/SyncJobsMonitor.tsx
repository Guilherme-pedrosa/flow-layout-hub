import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  RefreshCw, Play, AlertTriangle, CheckCircle2, Clock, Skull, 
  Loader2, RotateCcw, ChevronDown, ChevronUp, Activity, Zap
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncJob {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: any;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
}

interface SyncJobsStats {
  pending: number;
  processing: number;
  done: number;
  error: number;
  dead: number;
  stuck: number;
}

// Mascarar dados sensíveis (CPF, CNPJ, telefone, email)
function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // CPF: 000.000.000-00 ou 00000000000
    let masked = obj.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***.***.***-**');
    // CNPJ: 00.000.000/0000-00 ou 00000000000000
    masked = masked.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '**.***.***/****-**');
    // Telefone: (00) 00000-0000 ou variações
    masked = masked.replace(/\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g, '(**) *****-****');
    // Email parcial
    masked = masked.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
    return masked;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }
  if (typeof obj === 'object') {
    const masked: any = {};
    for (const key of Object.keys(obj)) {
      masked[key] = maskSensitiveData(obj[key]);
    }
    return masked;
  }
  return obj;
}

const WORKER_COOLDOWN_MS = 30000; // 30 segundos

export function SyncJobsMonitor() {
  const { currentCompany } = useCompany();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [stats, setStats] = useState<SyncJobsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerCooldown, setWorkerCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const fetchStats = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      // Usar RPC para estatísticas (evita count no front)
      const { data, error } = await supabase.rpc('get_sync_jobs_stats' as any, {
        p_company_id: currentCompany.id
      });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as any;
        setStats({
          pending: Number(row.pending) || 0,
          processing: Number(row.processing) || 0,
          done: Number(row.done) || 0,
          error: Number(row.error) || 0,
          dead: Number(row.dead) || 0,
          stuck: Number(row.stuck) || 0,
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar stats:', err);
      // Fallback se RPC não existir
      const { data: allJobs } = await supabase
        .from('sync_jobs')
        .select('status, processing_started_at')
        .eq('company_id', currentCompany.id);

      if (allJobs) {
        const now = new Date();
        const newStats: SyncJobsStats = {
          pending: allJobs.filter(j => j.status === 'pending').length,
          processing: allJobs.filter(j => j.status === 'processing' && (!j.processing_started_at || differenceInMinutes(now, new Date(j.processing_started_at)) < 5)).length,
          done: allJobs.filter(j => j.status === 'done').length,
          error: allJobs.filter(j => j.status === 'error').length,
          dead: allJobs.filter(j => j.status === 'dead').length,
          stuck: allJobs.filter(j => j.status === 'processing' && j.processing_started_at && differenceInMinutes(now, new Date(j.processing_started_at)) >= 5).length,
        };
        setStats(newStats);
      }
    }
  }, [currentCompany?.id]);

  const fetchJobs = useCallback(async () => {
    if (!currentCompany?.id) return;

    setLoading(true);
    try {
      await fetchStats();

      // Buscar jobs com filtros
      let query = supabase
        .from('sync_jobs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (statusFilter !== 'all') {
        if (statusFilter === 'stuck') {
          // Jobs stuck = processing há mais de 5 min
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          query = query.eq('status', 'processing').lte('processing_started_at', fiveMinAgo);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar sync_jobs:', err);
      toast.error('Erro ao buscar jobs de sincronização');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, statusFilter, entityFilter, limit, fetchStats]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Refresh automático a cada 10 segundos quando há jobs pendentes ou em processamento
  useEffect(() => {
    if (!stats || (stats.pending === 0 && stats.processing === 0 && stats.stuck === 0)) return;

    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [stats, fetchJobs]);

  // Cooldown timer para botão Worker
  useEffect(() => {
    if (!workerCooldown) return;

    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          setWorkerCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [workerCooldown]);

  const runWorker = async () => {
    if (workerCooldown) {
      toast.warning(`Aguarde ${cooldownRemaining}s antes de executar novamente`);
      return;
    }

    setWorkerLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('field-sync-worker', {
        body: {}
      });

      if (error) throw error;

      if (data.ok) {
        toast.success(`Worker executado: ${data.success || 0} sucesso, ${data.errors || 0} erros`);
        
        // Registrar no audit_logs
        await supabase.from('audit_logs').insert({
          company_id: currentCompany!.id,
          entity: 'sync_jobs',
          action: 'worker_manual_execution',
          metadata_json: {
            results: data
          }
        });
      } else {
        toast.error(data.error || 'Erro ao executar worker');
      }

      // Ativar cooldown
      setWorkerCooldown(true);
      setCooldownRemaining(WORKER_COOLDOWN_MS / 1000);

      // Atualizar lista após worker
      await fetchJobs();
    } catch (err: any) {
      console.error('Erro ao executar worker:', err);
      toast.error(err.message || 'Erro ao executar worker');
    } finally {
      setWorkerLoading(false);
    }
  };

  const reapStuckJobs = async () => {
    try {
      const { data, error } = await supabase.rpc('reap_stuck_sync_jobs' as any, {
        p_stuck_minutes: 5
      });

      if (error) throw error;

      const count = data || 0;
      if (count > 0) {
        toast.success(`${count} jobs travados liberados`);
        
        // Registrar no audit_logs
        await supabase.from('audit_logs').insert({
          company_id: currentCompany!.id,
          entity: 'sync_jobs',
          action: 'reap_stuck_jobs',
          metadata_json: { released_count: count }
        });
      } else {
        toast.info('Nenhum job travado encontrado');
      }

      await fetchJobs();
    } catch (err: any) {
      toast.error('Erro ao liberar jobs travados');
    }
  };

  const retryJob = async (jobId: string, currentAttempts: number) => {
    try {
      // NÃO zerar attempts - manter histórico
      await supabase
        .from('sync_jobs')
        .update({
          status: 'pending',
          last_error: null,
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        company_id: currentCompany!.id,
        entity: 'sync_jobs',
        entity_id: jobId,
        action: 'manual_retry',
        metadata_json: { previous_attempts: currentAttempts }
      });

      toast.success('Job reativado para retry');
      await fetchJobs();
    } catch (err: any) {
      toast.error('Erro ao reativar job');
    }
  };

  const retryAllErrors = async () => {
    if (!currentCompany?.id) return;

    try {
      // Buscar jobs com erro para contar
      const { data: errorJobs } = await supabase
        .from('sync_jobs')
        .select('id, attempts')
        .eq('company_id', currentCompany.id)
        .in('status', ['error', 'dead']);

      if (!errorJobs || errorJobs.length === 0) {
        toast.info('Nenhum job com erro encontrado');
        return;
      }

      // NÃO zerar attempts
      await supabase
        .from('sync_jobs')
        .update({
          status: 'pending',
          last_error: null,
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('company_id', currentCompany.id)
        .in('status', ['error', 'dead']);

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        company_id: currentCompany.id,
        entity: 'sync_jobs',
        action: 'bulk_manual_retry',
        metadata_json: { 
          count: errorJobs.length,
          job_ids: errorJobs.map(j => j.id)
        }
      });

      toast.success(`${errorJobs.length} jobs reativados`);
      await fetchJobs();
    } catch (err: any) {
      toast.error('Erro ao reativar jobs');
    }
  };

  const isJobStuck = (job: SyncJob): boolean => {
    if (job.status !== 'processing' || !job.processing_started_at) return false;
    return differenceInMinutes(new Date(), new Date(job.processing_started_at)) >= 5;
  };

  const getStatusBadge = (job: SyncJob) => {
    if (isJobStuck(job)) {
      return <Badge variant="destructive" className="gap-1 bg-orange-500"><Zap className="h-3 w-3" /> Travado</Badge>;
    }
    
    switch (job.status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processando</Badge>;
      case 'done':
        return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Erro</Badge>;
      case 'dead':
        return <Badge variant="destructive" className="bg-gray-700 gap-1"><Skull className="h-3 w-3" /> Dead Letter</Badge>;
      default:
        return <Badge variant="outline">{job.status}</Badge>;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Cliente';
      case 'equipment': return 'Equipamento';
      case 'service_order': return 'Ordem de Serviço';
      default: return type;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yy HH:mm", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoramento de Sincronização
            </CardTitle>
            <CardDescription>
              Acompanhe os jobs de sincronização WAI ↔ Field Control
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={runWorker}
              disabled={workerLoading || workerCooldown}
              className="gap-1"
              title={workerCooldown ? `Aguarde ${cooldownRemaining}s` : 'Executar worker de sincronização'}
            >
              {workerLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {workerCooldown ? `${cooldownRemaining}s` : 'Worker'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-6 gap-2 text-sm">
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'pending' ? 'ring-2 ring-primary' : ''
              } bg-muted hover:bg-muted/80`}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'processing' ? 'ring-2 ring-primary' : ''
              } bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50`}
              onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
            >
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-xs text-muted-foreground">Processando</div>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'stuck' ? 'ring-2 ring-primary' : ''
              } bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50`}
              onClick={() => setStatusFilter(statusFilter === 'stuck' ? 'all' : 'stuck')}
            >
              <div className="text-2xl font-bold text-orange-600">{stats.stuck}</div>
              <div className="text-xs text-muted-foreground">Travados</div>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'done' ? 'ring-2 ring-primary' : ''
              } bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50`}
              onClick={() => setStatusFilter(statusFilter === 'done' ? 'all' : 'done')}
            >
              <div className="text-2xl font-bold text-green-600">{stats.done}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'error' ? 'ring-2 ring-primary' : ''
              } bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50`}
              onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')}
            >
              <div className="text-2xl font-bold text-red-600">{stats.error}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-colors ${
                statusFilter === 'dead' ? 'ring-2 ring-primary' : ''
              } bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700`}
              onClick={() => setStatusFilter(statusFilter === 'dead' ? 'all' : 'dead')}
            >
              <div className="text-2xl font-bold text-gray-600">{stats.dead}</div>
              <div className="text-xs text-muted-foreground">Dead Letter</div>
            </div>
          </div>
        )}

        {/* Filtros e Ações */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Entidades</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="equipment">Equipamento</SelectItem>
              <SelectItem value="service_order">Ordem de Serviço</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Limite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 jobs</SelectItem>
              <SelectItem value="50">50 jobs</SelectItem>
              <SelectItem value="100">100 jobs</SelectItem>
              <SelectItem value="200">200 jobs</SelectItem>
            </SelectContent>
          </Select>

          {(stats?.stuck || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={reapStuckJobs}
              className="gap-1 text-orange-600 hover:text-orange-700"
            >
              <Zap className="h-4 w-4" />
              Liberar travados ({stats?.stuck})
            </Button>
          )}

          {(stats?.error || 0) + (stats?.dead || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryAllErrors}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reativar erros ({(stats?.error || 0) + (stats?.dead || 0)})
            </Button>
          )}
        </div>

        {/* Tabela de Jobs */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Tentativas</TableHead>
                  <TableHead>Próx. Retry</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum job encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <>
                      <TableRow 
                        key={job.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${isJobStuck(job) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      >
                        <TableCell>
                          {expandedJob === job.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{getEntityLabel(job.entity_type)}</span>
                          <div className="text-xs text-muted-foreground font-mono">
                            {job.entity_id.substring(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{job.action}</TableCell>
                        <TableCell>{getStatusBadge(job)}</TableCell>
                        <TableCell className="text-center">
                          <span className={job.attempts >= job.max_attempts ? 'text-red-600 font-bold' : ''}>
                            {job.attempts} / {job.max_attempts}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.next_retry_at ? formatDate(job.next_retry_at) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(job.updated_at)}
                        </TableCell>
                        <TableCell>
                          {(job.status === 'error' || job.status === 'dead' || isJobStuck(job)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryJob(job.id, job.attempts);
                              }}
                              className="h-7 w-7 p-0"
                              title="Reativar job"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedJob === job.id && (
                        <TableRow key={`${job.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-3 space-y-3 text-sm">
                              <div>
                                <span className="font-medium">Entity ID:</span>{' '}
                                <code className="bg-muted px-1 rounded">{job.entity_id}</code>
                              </div>
                              {isJobStuck(job) && job.processing_started_at && (
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-700 dark:text-orange-300">
                                  <span className="font-medium">⚠️ Job travado há {differenceInMinutes(new Date(), new Date(job.processing_started_at))} minutos</span>
                                </div>
                              )}
                              {job.last_error && (
                                <div>
                                  <span className="font-medium text-red-600">Último Erro:</span>
                                  <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto whitespace-pre-wrap text-red-700 dark:text-red-300">
                                    {maskSensitiveData(job.last_error)}
                                  </pre>
                                </div>
                              )}
                              {job.payload_json && (
                                <div>
                                  <span className="font-medium">Payload (dados sensíveis mascarados):</span>
                                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                                    {JSON.stringify(maskSensitiveData(job.payload_json), null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Criado: {formatDate(job.created_at)}</span>
                                {job.processing_started_at && (
                                  <span>Processamento iniciado: {formatDate(job.processing_started_at)}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
