import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Task {
  id: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface TasksListProps {
  tasks: Task[];
  isLoading?: boolean;
  onComplete: (id: string) => void;
}

const priorityConfig = {
  high: { label: 'Alta', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  medium: { label: 'Média', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  low: { label: 'Baixa', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, 'dd/MM', { locale: ptBR });
}

export function TasksList({ tasks, isLoading, onComplete }: TasksListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    console.log(`Tarefa ${id} concluída`);
    onComplete(id);
    // Reset after animation
    setTimeout(() => setCompletingId(null), 500);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
            <p className="text-muted-foreground">Nenhuma tarefa pendente!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTasks = tasks.slice(0, 5);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {displayTasks.map((task) => {
            const isCompleting = completingId === task.id;
            const isOverdue = isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
            const config = priorityConfig[task.priority];

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-4 py-3 transition-opacity',
                  isCompleting && 'opacity-50'
                )}
              >
                <Checkbox
                  checked={isCompleting}
                  disabled={isCompleting}
                  onCheckedChange={() => handleComplete(task.id)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2',
                    isCompleting && 'border-emerald-500 bg-emerald-500'
                  )}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.description}</p>
                  <Badge variant="secondary" className={cn('mt-1', config.className)}>
                    {config.label}
                  </Badge>
                </div>

                <span
                  className={cn(
                    'text-sm whitespace-nowrap',
                    isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
