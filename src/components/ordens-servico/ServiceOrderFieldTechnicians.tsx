import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, User, Mail, Phone } from "lucide-react";

interface FieldTechnician {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
}

interface ServiceOrderFieldTechniciansProps {
  technicians: FieldTechnician[];
}

export function ServiceOrderFieldTechnicians({ technicians }: ServiceOrderFieldTechniciansProps) {
  if (!technicians || technicians.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Técnicos Field Control
          <Badge variant="secondary" className="ml-2">
            {technicians.length} técnico(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech, index) => (
            <div
              key={tech.id || index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{tech.name}</p>
                {tech.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{tech.email}</span>
                  </p>
                )}
                {tech.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {tech.phone}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
