import { AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIRiskBadgeProps {
  type: "high_risk" | "good_payer" | "attention";
  className?: string;
}

export function AIRiskBadge({ type, className }: AIRiskBadgeProps) {
  if (type === "high_risk") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400",
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        Risco alto
      </span>
    );
  }

  if (type === "good_payer") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400",
        className
      )}>
        <CheckCircle className="h-3 w-3" />
        Bom pagador
      </span>
    );
  }

  if (type === "attention") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400",
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        Atenção
      </span>
    );
  }

  return null;
}

// Utility function to determine risk based on payable data
export function calculateRisk(payable: {
  is_paid?: boolean;
  due_date: string;
  amount: number;
  payment_status?: string | null;
}): "high_risk" | "good_payer" | "attention" | null {
  if (payable.is_paid) return null;
  
  const today = new Date();
  const dueDate = new Date(payable.due_date);
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // High risk: more than 15 days overdue
  if (diffDays > 15) return "high_risk";
  
  // Attention: 1-15 days overdue
  if (diffDays > 0 && diffDays <= 15) return "attention";
  
  return null;
}

// Utility to determine payer quality based on history
export function calculatePayerQuality(
  paymentHistory: { is_paid: boolean; paid_at?: string | null; due_date: string }[]
): "good_payer" | "high_risk" | null {
  if (paymentHistory.length < 3) return null;
  
  const paidOnTime = paymentHistory.filter(p => {
    if (!p.is_paid || !p.paid_at) return false;
    const paidDate = new Date(p.paid_at);
    const dueDate = new Date(p.due_date);
    return paidDate <= dueDate;
  }).length;
  
  const ratio = paidOnTime / paymentHistory.length;
  
  if (ratio >= 0.8) return "good_payer";
  if (ratio <= 0.3) return "high_risk";
  
  return null;
}
