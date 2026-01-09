import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, User, Calendar, Download, Mail, ShieldCheck, ShieldX, 
  Clock, FileX, CheckCircle, AlertTriangle 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Integration, BlockReason } from "@/hooks/useIntegrationsModule";

interface IntegrationDetailModalProps {
  open: boolean;
  onClose: () => void;
  integration: Integration & { clientName: string; techNames: string } | null;
  onRevalidate?: () => void;
  onDownloadZip?: () => void;
  onSendEmail?: () => void;
}

function StatusBadge({ status, expiryDate }: { status: Integration['status']; expiryDate?: string | null }) {
  if (expiryDate && new Date(expiryDate) < new Date()) {
    return <Badge variant="destructive" className="bg-orange-600">EXPIRADO</Badge>;
  }
  
  switch (status) {
    case 'authorized':
      return <Badge className="bg-green-600">AUTORIZADO</Badge>;
    case 'sent':
      return <Badge className="bg-blue-600">ENVIADO</Badge>;
    case 'blocked':
      return <Badge variant="destructive">BLOQUEADO</Badge>;
    case 'expired':
      return <Badge variant="destructive" className="bg-orange-600">EXPIRADO</Badge>;
    case 'draft':
      return <Badge variant="outline">RASCUNHO</Badge>;
    default:
      return null;
  }
}

export function IntegrationDetailModal({
  open,
  onClose,
  integration,
  onRevalidate,
  onDownloadZip,
  onSendEmail,
}: IntegrationDetailModalProps) {
  if (!integration) return null;

  const isAuthorizedOrSent = integration.status === 'authorized' || integration.status === 'sent';
  const hasZip = !!integration.zip_file_name;
  const blockReasons = integration.blocked_reasons || [];

  // Group block reasons by scope
  const companyReasons = blockReasons.filter(r => r.scope === 'EMPRESA');
  const techReasons = blockReasons.filter(r => r.scope === 'TÉCNICO');

  // Group tech reasons by technician
  const techReasonsByTech: Record<string, BlockReason[]> = {};
  techReasons.forEach(r => {
    const name = r.entity_name || 'Técnico';
    if (!techReasonsByTech[name]) techReasonsByTech[name] = [];
    techReasonsByTech[name].push(r);
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            Detalhes da Integração
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={integration.status} expiryDate={integration.earliest_expiry_date} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-xs">{integration.id.slice(0, 8)}...</p>
              </div>
            </div>

            {/* Client & Technicians */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Cliente</span>
                </div>
                <p className="font-semibold">{integration.clientName}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Técnico(s)</span>
                </div>
                <p className="font-semibold">{integration.techNames || 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {integration.technician_ids.length} técnico(s)
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-medium">
                  {format(new Date(integration.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
              
              {integration.validated_at && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Validado em</p>
                  <p className="text-sm font-medium">
                    {format(new Date(integration.validated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              )}

              {integration.earliest_expiry_date && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Próx. Vencimento</p>
                  <p className="text-sm font-medium">
                    {format(new Date(integration.earliest_expiry_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}
            </div>

            {integration.sent_at && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Enviado</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(integration.sent_at), { addSuffix: true, locale: ptBR })}
                </p>
                {integration.sent_to && integration.sent_to.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para: {integration.sent_to.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Block Reasons */}
            {blockReasons.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="font-semibold">Motivos de Bloqueio</h3>
                    <Badge variant="destructive" className="ml-auto">{blockReasons.length}</Badge>
                  </div>

                  {companyReasons.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Empresa
                      </p>
                      <div className="space-y-1">
                        {companyReasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                            <FileX className="h-4 w-4 text-destructive" />
                            <span className="font-medium">{r.doc_type}:</span>
                            <span className="text-muted-foreground">{r.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(techReasonsByTech).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" /> Técnicos
                      </p>
                      <div className="space-y-3">
                        {Object.entries(techReasonsByTech).map(([techName, reasons]) => (
                          <div key={techName} className="border rounded-lg p-3">
                            <p className="font-medium text-sm mb-2">{techName}</p>
                            <div className="space-y-1">
                              {reasons.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <FileX className="h-3 w-3 text-destructive" />
                                  <span>{r.doc_type}:</span>
                                  <span>{r.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ZIP Info */}
            {hasZip && (
              <>
                <Separator />
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">ZIP Gerado</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {integration.zip_file_name}
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onRevalidate}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Revalidar
              </Button>
              
              {isAuthorizedOrSent && (
                <>
                  <Button onClick={onDownloadZip}>
                    <Download className="mr-2 h-4 w-4" />
                    {hasZip ? 'Baixar ZIP' : 'Gerar ZIP'}
                  </Button>
                  <Button variant="outline" onClick={onSendEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar por E-mail
                  </Button>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
