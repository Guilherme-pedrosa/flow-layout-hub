import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, 
  Clock, 
  Camera, 
  CheckCircle2, 
  Circle,
  Play,
  Pause,
  Square,
  MessageSquare,
  Upload,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface FieldEvent {
  id: string;
  type: "check_in" | "check_out" | "photo" | "note" | "task_complete" | "pause" | "resume";
  timestamp: Date;
  description: string;
  location?: { lat: number; lng: number };
  technician?: string;
  imageUrl?: string;
}

interface FieldTask {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

interface ServiceOrderFieldControlProps {
  orderId: string;
  technicianName?: string;
  onUpdate?: () => void;
}

export function ServiceOrderFieldControl({ 
  orderId, 
  technicianName = "Técnico",
  onUpdate 
}: ServiceOrderFieldControlProps) {
  const [events, setEvents] = useState<FieldEvent[]>([
    {
      id: "1",
      type: "check_in",
      timestamp: new Date(Date.now() - 3600000 * 2),
      description: "Check-in no local",
      location: { lat: -23.5505, lng: -46.6333 },
      technician: technicianName,
    },
    {
      id: "2",
      type: "photo",
      timestamp: new Date(Date.now() - 3600000 * 1.5),
      description: "Foto do equipamento antes do reparo",
      technician: technicianName,
    },
    {
      id: "3",
      type: "task_complete",
      timestamp: new Date(Date.now() - 3600000),
      description: "Diagnóstico realizado",
      technician: technicianName,
    },
  ]);

  const [tasks, setTasks] = useState<FieldTask[]>([
    { id: "t1", description: "Check-in no cliente", completed: true, completedAt: new Date(Date.now() - 3600000 * 2) },
    { id: "t2", description: "Fotografar equipamento (antes)", completed: true, completedAt: new Date(Date.now() - 3600000 * 1.5) },
    { id: "t3", description: "Realizar diagnóstico", completed: true, completedAt: new Date(Date.now() - 3600000) },
    { id: "t4", description: "Executar reparo", completed: false },
    { id: "t5", description: "Testar funcionamento", completed: false },
    { id: "t6", description: "Fotografar equipamento (depois)", completed: false },
    { id: "t7", description: "Coletar assinatura do cliente", completed: false },
    { id: "t8", description: "Check-out", completed: false },
  ]);

  const [isWorking, setIsWorking] = useState(true);
  const [note, setNote] = useState("");

  const handleCheckIn = () => {
    const newEvent: FieldEvent = {
      id: Date.now().toString(),
      type: "check_in",
      timestamp: new Date(),
      description: "Check-in no local",
      location: { lat: -23.5505, lng: -46.6333 },
      technician: technicianName,
    };
    setEvents([newEvent, ...events]);
    toast.success("Check-in registrado!");
  };

  const handleCheckOut = () => {
    const newEvent: FieldEvent = {
      id: Date.now().toString(),
      type: "check_out",
      timestamp: new Date(),
      description: "Check-out do local",
      location: { lat: -23.5505, lng: -46.6333 },
      technician: technicianName,
    };
    setEvents([newEvent, ...events]);
    toast.success("Check-out registrado!");
  };

  const handleTogglePause = () => {
    const newEvent: FieldEvent = {
      id: Date.now().toString(),
      type: isWorking ? "pause" : "resume",
      timestamp: new Date(),
      description: isWorking ? "Trabalho pausado" : "Trabalho retomado",
      technician: technicianName,
    };
    setEvents([newEvent, ...events]);
    setIsWorking(!isWorking);
    toast.info(isWorking ? "Trabalho pausado" : "Trabalho retomado");
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const newEvent: FieldEvent = {
      id: Date.now().toString(),
      type: "note",
      timestamp: new Date(),
      description: note,
      technician: technicianName,
    };
    setEvents([newEvent, ...events]);
    setNote("");
    toast.success("Anotação registrada!");
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const completed = !task.completed;
        if (completed) {
          const newEvent: FieldEvent = {
            id: Date.now().toString(),
            type: "task_complete",
            timestamp: new Date(),
            description: task.description,
            technician: technicianName,
          };
          setEvents([newEvent, ...events]);
        }
        return { ...task, completed, completedAt: completed ? new Date() : undefined };
      }
      return task;
    }));
  };

  const getEventIcon = (type: FieldEvent["type"]) => {
    switch (type) {
      case "check_in": return <MapPin className="h-4 w-4 text-green-500" />;
      case "check_out": return <MapPin className="h-4 w-4 text-red-500" />;
      case "photo": return <Camera className="h-4 w-4 text-blue-500" />;
      case "note": return <MessageSquare className="h-4 w-4 text-yellow-500" />;
      case "task_complete": return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "pause": return <Pause className="h-4 w-4 text-orange-500" />;
      case "resume": return <Play className="h-4 w-4 text-green-500" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercent = (completedTasks / tasks.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header com Ações Rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Controle de Campo
            </CardTitle>
            <Badge variant={isWorking ? "default" : "secondary"}>
              {isWorking ? "Em Andamento" : "Pausado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCheckIn} variant="outline" size="sm">
              <MapPin className="h-4 w-4 mr-2" />
              Check-in
            </Button>
            <Button onClick={handleTogglePause} variant="outline" size="sm">
              {isWorking ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Retomar
                </>
              )}
            </Button>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Foto
            </Button>
            <Button onClick={handleCheckOut} variant="outline" size="sm">
              <Square className="h-4 w-4 mr-2" />
              Check-out
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Checklist de Tarefas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Checklist
              </CardTitle>
              <Badge variant="secondary">
                {completedTasks}/{tasks.length}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  task.completed ? "bg-muted/50" : "hover:bg-muted/30"
                }`}
              >
                <Checkbox 
                  checked={task.completed}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
                <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                  {task.description}
                </span>
                {task.completedAt && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(task.completedAt, "HH:mm")}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline de Eventos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Adicionar Nota */}
            <div className="flex gap-2 mb-4">
              <Textarea 
                placeholder="Adicionar anotação..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[60px]"
              />
              <Button onClick={handleAddNote} size="icon" className="shrink-0">
                <Upload className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de Eventos */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {events.map((event, index) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getEventIcon(event.type)}
                    </div>
                    {index < events.length - 1 && (
                      <div className="w-px h-full bg-border min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{event.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{event.technician}</span>
                      <span>•</span>
                      <Calendar className="h-3 w-3" />
                      <span>{format(event.timestamp, "dd/MM HH:mm", { locale: ptBR })}</span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span>GPS registrado</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
