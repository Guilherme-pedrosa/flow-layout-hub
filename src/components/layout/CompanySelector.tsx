import { useState } from 'react';
import { Building2, Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';

export function CompanySelector() {
  const { currentCompany, companies, isLoading, switchCompany } = useCompany();
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!currentCompany) {
    return null;
  }

  // Pegar iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Encontrar empresa pendente
  const pendingCompany = companies.find(uc => uc.company_id === pendingCompanyId)?.company;

  // Handler para clique na empresa
  const handleCompanyClick = (companyId: string) => {
    // Se for a mesma empresa, não faz nada
    if (companyId === currentCompany.id) return;
    
    // Abre diálogo de confirmação
    setPendingCompanyId(companyId);
    setShowConfirmDialog(true);
  };

  // Handler para confirmar troca
  const handleConfirmSwitch = () => {
    if (pendingCompanyId) {
      switchCompany(pendingCompanyId);
    }
    setShowConfirmDialog(false);
    setPendingCompanyId(null);
  };

  // Handler para cancelar troca
  const handleCancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingCompanyId(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 md:gap-2 h-auto py-1.5 md:py-2 px-2 md:px-3 hover:bg-secondary max-w-[180px] md:max-w-none"
          >
            <Avatar className="h-7 w-7 md:h-8 md:w-8 rounded-md flex-shrink-0">
              {currentCompany.logo_url ? (
                <AvatarImage src={currentCompany.logo_url} alt={currentCompany.name} />
              ) : null}
              <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[10px] md:text-xs">
                {getInitials(currentCompany.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start text-left min-w-0">
              <span className="text-xs md:text-sm font-medium max-w-[100px] md:max-w-[150px] truncate">
                {currentCompany.name}
              </span>
              {currentCompany.cnpj && (
                <span className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[100px] md:max-w-[150px]">
                  {formatCNPJ(currentCompany.cnpj)}
                </span>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 z-[100] bg-popover border shadow-lg">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Trocar Empresa
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((uc) => (
            <DropdownMenuItem
              key={uc.company_id}
              onClick={() => handleCompanyClick(uc.company_id)}
              className={cn(
                'flex items-center gap-3 py-3 cursor-pointer',
                currentCompany.id === uc.company_id && 'bg-secondary'
              )}
            >
              <Avatar className="h-8 w-8 rounded-md">
                {uc.company.logo_url ? (
                  <AvatarImage src={uc.company.logo_url} alt={uc.company.name} />
                ) : null}
                <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-xs">
                  {getInitials(uc.company.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uc.company.name}</p>
                {uc.company.cnpj && (
                  <p className="text-xs text-muted-foreground">
                    {formatCNPJ(uc.company.cnpj)}
                  </p>
                )}
              </div>
              {currentCompany.id === uc.company_id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          {companies.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma empresa disponível
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar troca de empresa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a trocar de empresa. Todos os dados exibidos serão alterados para a nova empresa selecionada.
              </p>
              {pendingCompany && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10 rounded-md">
                    {pendingCompany.logo_url ? (
                      <AvatarImage src={pendingCompany.logo_url} alt={pendingCompany.name} />
                    ) : null}
                    <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-sm">
                      {getInitials(pendingCompany.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{pendingCompany.name}</p>
                    {pendingCompany.cnpj && (
                      <p className="text-sm text-muted-foreground">
                        {formatCNPJ(pendingCompany.cnpj)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-sm">
                Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Sim, trocar empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
