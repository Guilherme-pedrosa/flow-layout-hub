import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { Json } from "@/integrations/supabase/types";
export type AuditEventType =
  | "user.created" | "user.updated" | "user.deleted" | "role.changed"
  | "purchase_order.created" | "purchase_order.updated" | "purchase_order.approved" | "purchase_order.xml_uploaded" | "purchase_order.cte_uploaded"
  | "sale.created" | "sale.updated" | "sale.status_changed" | "sale.deleted"
  | "service_order.created" | "service_order.updated" | "service_order.status_changed" 
  | "service_order.checkout_started" | "service_order.checkout_item_scanned" | "service_order.checkout_finalized" | "service_order.checkout_reopened"
  | "stock.movement.created"
  | "payable.created" | "payable.approved" | "payable.paid" | "payable.canceled"
  | "receivable.created" | "receivable.received" | "receivable.canceled"
  | "bank.reconciliation.attempted" | "bank.reconciliation.auto_matched" | "bank.reconciliation.confirmed" | "bank.reconciliation.rejected"
  | "product.created" | "product.updated" | "product.deleted"
  | "supplier.created" | "supplier.updated" | "supplier.deleted"
  | "client.created" | "client.updated" | "client.deleted";

export type EntityType = 
  | "user" | "purchase_order" | "sale" | "service_order" 
  | "stock_movement" | "payable" | "receivable" | "bank_reconciliation"
  | "product" | "supplier" | "client";

// Critical events that should trigger WAI Observer analysis
const CRITICAL_EVENTS: AuditEventType[] = [
  "purchase_order.approved",
  "purchase_order.xml_uploaded",
  "sale.deleted",
  "sale.status_changed",
  "service_order.checkout_finalized",
  "service_order.checkout_reopened",
  "payable.approved",
  "payable.paid",
  "bank.reconciliation.confirmed",
  "stock.movement.created",
];

interface LogEventOptions {
  eventType: AuditEventType;
  entityType: EntityType;
  entityId?: string;
  diff?: Json;
  payload?: Json;
  triggerObserver?: boolean;
}

export function useAuditLog() {
  const { currentCompany } = useCompany();

  const logEvent = useCallback(async ({
    eventType,
    entityType,
    entityId,
    diff,
    payload,
    triggerObserver = CRITICAL_EVENTS.includes(eventType),
  }: LogEventOptions) => {
    if (!currentCompany?.id) {
      console.warn("[AuditLog] No company context, skipping log");
      return { success: false, error: "No company context" };
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert audit event
      const { error: auditError } = await supabase
        .from("audit_events")
        .insert([{
          company_id: currentCompany.id,
          actor_user_id: user?.id || null,
          actor_auth_id: user?.id || null,
          event_type: eventType,
          entity_type: entityType,
          entity_id: entityId || null,
          source: "app",
          diff: diff || null,
          payload: payload || null,
        }]);

      if (auditError) {
        console.error("[AuditLog] Failed to insert audit event:", auditError);
        return { success: false, error: auditError.message };
      }

      // Trigger WAI Observer for critical events
      if (triggerObserver && entityId) {
        try {
          await supabase.functions.invoke("wai-observer", {
            body: {
              mode: "proactive_event",
              payload: {
                company_id: currentCompany.id,
                event_type: eventType,
                entity_type: entityType,
                entity_id: entityId,
                actor_user_id: user?.id,
              },
            },
          });
        } catch (observerError) {
          // Don't fail the whole operation if observer fails
          console.warn("[AuditLog] WAI Observer call failed:", observerError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("[AuditLog] Unexpected error:", error);
      return { success: false, error: String(error) };
    }
  }, [currentCompany?.id]);

  return { logEvent };
}
