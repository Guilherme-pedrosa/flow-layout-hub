/**
 * Este arquivo fornece funções utilitárias para facilitar a integração
 * do audit log em componentes existentes sem modificar muito código.
 */

import { useAuditLog, AuditEventType, EntityType } from "./useAuditLog";
import type { Json } from "@/integrations/supabase/types";

export function useAuditLogIntegration() {
  const { logEvent } = useAuditLog();

  // Compras
  const logPurchaseOrderCreated = (orderId: string, payload?: Json) =>
    logEvent({ eventType: "purchase_order.created", entityType: "purchase_order", entityId: orderId, payload });

  const logPurchaseOrderUpdated = (orderId: string, diff?: Json) =>
    logEvent({ eventType: "purchase_order.updated", entityType: "purchase_order", entityId: orderId, diff });

  const logPurchaseOrderApproved = (orderId: string, payload?: Json) =>
    logEvent({ eventType: "purchase_order.approved", entityType: "purchase_order", entityId: orderId, payload, triggerObserver: true });

  const logPurchaseOrderXmlUploaded = (orderId: string, payload?: Json) =>
    logEvent({ eventType: "purchase_order.xml_uploaded", entityType: "purchase_order", entityId: orderId, payload, triggerObserver: true });

  // Vendas
  const logSaleCreated = (saleId: string, payload?: Json) =>
    logEvent({ eventType: "sale.created", entityType: "sale", entityId: saleId, payload });

  const logSaleUpdated = (saleId: string, diff?: Json) =>
    logEvent({ eventType: "sale.updated", entityType: "sale", entityId: saleId, diff });

  const logSaleStatusChanged = (saleId: string, payload?: Json) =>
    logEvent({ eventType: "sale.status_changed", entityType: "sale", entityId: saleId, payload, triggerObserver: true });

  const logSaleDeleted = (saleId: string, payload?: Json) =>
    logEvent({ eventType: "sale.deleted", entityType: "sale", entityId: saleId, payload, triggerObserver: true });

  // Ordens de Serviço
  const logServiceOrderCreated = (osId: string, payload?: Json) =>
    logEvent({ eventType: "service_order.created", entityType: "service_order", entityId: osId, payload });

  const logServiceOrderUpdated = (osId: string, diff?: Json) =>
    logEvent({ eventType: "service_order.updated", entityType: "service_order", entityId: osId, diff });

  const logServiceOrderStatusChanged = (osId: string, payload?: Json) =>
    logEvent({ eventType: "service_order.status_changed", entityType: "service_order", entityId: osId, payload, triggerObserver: true });

  const logServiceOrderCheckoutFinalized = (osId: string, payload?: Json) =>
    logEvent({ eventType: "service_order.checkout_finalized", entityType: "service_order", entityId: osId, payload, triggerObserver: true });

  const logServiceOrderCheckoutReopened = (osId: string, payload?: Json) =>
    logEvent({ eventType: "service_order.checkout_reopened", entityType: "service_order", entityId: osId, payload, triggerObserver: true });

  // Financeiro
  const logPayableCreated = (payableId: string, payload?: Json) =>
    logEvent({ eventType: "payable.created", entityType: "payable", entityId: payableId, payload });

  const logPayableApproved = (payableId: string, payload?: Json) =>
    logEvent({ eventType: "payable.approved", entityType: "payable", entityId: payableId, payload, triggerObserver: true });

  const logPayablePaid = (payableId: string, payload?: Json) =>
    logEvent({ eventType: "payable.paid", entityType: "payable", entityId: payableId, payload, triggerObserver: true });

  const logReceivableCreated = (receivableId: string, payload?: Json) =>
    logEvent({ eventType: "receivable.created", entityType: "receivable", entityId: receivableId, payload });

  const logReceivableReceived = (receivableId: string, payload?: Json) =>
    logEvent({ eventType: "receivable.received", entityType: "receivable", entityId: receivableId, payload });

  // Conciliação
  const logReconciliationConfirmed = (transactionId: string, payload?: Json) =>
    logEvent({ eventType: "bank.reconciliation.confirmed", entityType: "bank_reconciliation", entityId: transactionId, payload, triggerObserver: true });

  // Estoque
  const logStockMovementCreated = (movementId: string, payload?: Json) =>
    logEvent({ eventType: "stock.movement.created", entityType: "stock_movement", entityId: movementId, payload, triggerObserver: true });

  // Produtos
  const logProductCreated = (productId: string, payload?: Json) =>
    logEvent({ eventType: "product.created", entityType: "product", entityId: productId, payload });

  const logProductUpdated = (productId: string, diff?: Json) =>
    logEvent({ eventType: "product.updated", entityType: "product", entityId: productId, diff });

  // Clientes
  const logClientCreated = (clientId: string, payload?: Json) =>
    logEvent({ eventType: "client.created", entityType: "client", entityId: clientId, payload });

  const logClientUpdated = (clientId: string, diff?: Json) =>
    logEvent({ eventType: "client.updated", entityType: "client", entityId: clientId, diff });

  // Fornecedores
  const logSupplierCreated = (supplierId: string, payload?: Json) =>
    logEvent({ eventType: "supplier.created", entityType: "supplier", entityId: supplierId, payload });

  const logSupplierUpdated = (supplierId: string, diff?: Json) =>
    logEvent({ eventType: "supplier.updated", entityType: "supplier", entityId: supplierId, diff });

  return {
    // Base
    logEvent,
    // Compras
    logPurchaseOrderCreated,
    logPurchaseOrderUpdated,
    logPurchaseOrderApproved,
    logPurchaseOrderXmlUploaded,
    // Vendas
    logSaleCreated,
    logSaleUpdated,
    logSaleStatusChanged,
    logSaleDeleted,
    // OS
    logServiceOrderCreated,
    logServiceOrderUpdated,
    logServiceOrderStatusChanged,
    logServiceOrderCheckoutFinalized,
    logServiceOrderCheckoutReopened,
    // Financeiro
    logPayableCreated,
    logPayableApproved,
    logPayablePaid,
    logReceivableCreated,
    logReceivableReceived,
    logReconciliationConfirmed,
    // Estoque
    logStockMovementCreated,
    // Produtos
    logProductCreated,
    logProductUpdated,
    // Clientes
    logClientCreated,
    logClientUpdated,
    // Fornecedores
    logSupplierCreated,
    logSupplierUpdated,
  };
}
