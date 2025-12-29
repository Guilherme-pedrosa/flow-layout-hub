import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export type AuditAction =
  | "xml_import_started"
  | "xml_import_blocked"
  | "xml_import_completed"
  | "divergences_detected"
  | "divergence_applied"
  | "divergence_ignored"
  | "reapproval_required"
  | "cte_import_started"
  | "cte_import_completed"
  | "freight_changed";

interface AuditLogData {
  action: AuditAction;
  entityId: string;
  metadata: Record<string, unknown>;
}

export function usePurchaseOrderAudit() {
  const logAudit = async ({ action, entityId, metadata }: AuditLogData) => {
    try {
      const { error } = await supabase.from("audit_logs").insert({
        company_id: COMPANY_ID,
        entity: "purchase_order",
        entity_id: entityId,
        action,
        metadata_json: metadata as Json,
      });

      if (error) {
        console.error("Failed to log audit:", error);
      }
    } catch (error) {
      console.error("Audit log error:", error);
    }
  };

  const logXmlImportStarted = async (
    orderId: string,
    type: "nfe" | "cte",
    xmlInfo: { numero?: string; chave?: string }
  ) => {
    await logAudit({
      action: type === "nfe" ? "xml_import_started" : "cte_import_started",
      entityId: orderId,
      metadata: {
        type,
        ...xmlInfo,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const logXmlImportBlocked = async (
    orderId: string,
    reason: string,
    details: Record<string, unknown>
  ) => {
    await logAudit({
      action: "xml_import_blocked",
      entityId: orderId,
      metadata: {
        reason,
        ...details,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const logDivergencesDetected = async (
    orderId: string,
    divergences: Array<{
      field: string;
      orderValue: unknown;
      nfeValue: unknown;
    }>
  ) => {
    await logAudit({
      action: "divergences_detected",
      entityId: orderId,
      metadata: {
        divergenceCount: divergences.length,
        divergences: divergences.slice(0, 50), // Limit to prevent huge logs
        timestamp: new Date().toISOString(),
      },
    });
  };

  const logDivergenceApplied = async (
    orderId: string,
    divergence: {
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }
  ) => {
    await logAudit({
      action: "divergence_applied",
      entityId: orderId,
      metadata: {
        ...divergence,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const logXmlImportCompleted = async (
    orderId: string,
    type: "nfe" | "cte",
    summary: {
      numero: string;
      divergencesApplied: number;
      divergencesIgnored: number;
      requiresReapproval: boolean;
    }
  ) => {
    await logAudit({
      action: type === "nfe" ? "xml_import_completed" : "cte_import_completed",
      entityId: orderId,
      metadata: {
        type,
        ...summary,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const logReapprovalRequired = async (orderId: string, reason: string) => {
    await logAudit({
      action: "reapproval_required",
      entityId: orderId,
      metadata: {
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  };

  return {
    logXmlImportStarted,
    logXmlImportBlocked,
    logDivergencesDetected,
    logDivergenceApplied,
    logXmlImportCompleted,
    logReapprovalRequired,
  };
}
