import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<boolean>;
  itemName?: string;
  errorMessage?: string;
}

/**
 * Dialog de Confirmação de Exclusão
 * Segue princípio de UI Pessimista: só confirma após resposta do servidor
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  itemName,
  errorMessage,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const success = await onConfirm();
      if (success) {
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{description}</p>
            {itemName && (
              <p className="font-medium text-foreground">
                Item: {itemName}
              </p>
            )}
            {error && (
              <p className="text-destructive bg-destructive/10 p-2 rounded text-sm">
                {error}
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
