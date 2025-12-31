import { NFEItem, CTEData } from "@/components/compras/types";

export interface CostBreakdown {
  product_value: number;        // Valor do produto
  ipi_value: number;            // IPI (soma ao custo)
  icms_st_value: number;        // ICMS-ST (soma ao custo)
  freight_value: number;        // Frete rateado (soma ao custo)
  icms_credit: number;          // Crédito de ICMS (subtrai do custo)
  pis_credit: number;           // Crédito de PIS (subtrai do custo)
  cofins_credit: number;        // Crédito de COFINS (subtrai do custo)
  calculated_unit_cost: number; // Custo final calculado
}

export interface CalculateCostParams {
  item: NFEItem;
  freightPerItem: number;
  icmsStPerItem?: number;
}

export interface RateFreightConfig {
  method: 'value' | 'weight' | 'equal';
  totalFreight: number;
}

/**
 * Calcula o custo de um produto baseado na fórmula:
 * Custo Unitário = (Valor do Produto + IPI + ICMS-ST + Frete) - (Crédito ICMS + Crédito PIS + Crédito COFINS)
 */
export function calculateProductCost(params: CalculateCostParams): CostBreakdown {
  const { item, freightPerItem, icmsStPerItem = 0 } = params;
  const qty = item.quantidade || 1;

  // Valores que SOMAM ao custo (por unidade)
  const productValuePerUnit = item.valorUnitario || 0;
  const ipiPerUnit = (item.impostos?.ipi?.valor || 0) / qty;
  const icmsStPerUnit = icmsStPerItem / qty;
  const freightPerUnit = freightPerItem / qty;

  // Valores que SUBTRAEM do custo (créditos tributários por unidade)
  // Apenas se a empresa tiver direito ao crédito (regime normal, não Simples)
  const icmsCreditPerUnit = (item.impostos?.icms?.valor || 0) / qty;
  const pisCreditPerUnit = (item.impostos?.pis?.valor || 0) / qty;
  const cofinsCreditPerUnit = (item.impostos?.cofins?.valor || 0) / qty;

  // Fórmula do custo:
  // Custo = (Produto + IPI + ICMS-ST + Frete) - (ICMS + PIS + COFINS creditáveis)
  const custoSomado = productValuePerUnit + ipiPerUnit + icmsStPerUnit + freightPerUnit;
  const creditosDescontados = icmsCreditPerUnit + pisCreditPerUnit + cofinsCreditPerUnit;
  const calculatedUnitCost = custoSomado - creditosDescontados;

  return {
    product_value: productValuePerUnit,
    ipi_value: ipiPerUnit,
    icms_st_value: icmsStPerUnit,
    freight_value: freightPerUnit,
    icms_credit: icmsCreditPerUnit,
    pis_credit: pisCreditPerUnit,
    cofins_credit: cofinsCreditPerUnit,
    calculated_unit_cost: Math.max(0, calculatedUnitCost), // Nunca negativo
  };
}

/**
 * Rateia o frete entre os itens de acordo com o método especificado
 */
export function rateFreightToItems(
  items: NFEItem[],
  totalFreight: number,
  method: 'value' | 'weight' | 'equal' = 'value',
  weights?: number[]
): number[] {
  if (items.length === 0) return [];
  if (totalFreight <= 0) return items.map(() => 0);

  switch (method) {
    case 'equal':
      // Divide igualmente entre todos os itens
      const equalShare = totalFreight / items.length;
      return items.map(() => equalShare);

    case 'weight':
      // Rateia por peso (se disponível)
      if (!weights || weights.length !== items.length) {
        // Fallback para valor se peso não disponível
        return rateFreightToItems(items, totalFreight, 'value');
      }
      const totalWeight = weights.reduce((sum, w) => sum + (w || 0), 0);
      if (totalWeight === 0) {
        return rateFreightToItems(items, totalFreight, 'value');
      }
      return weights.map(w => (w / totalWeight) * totalFreight);

    case 'value':
    default:
      // Rateia pelo valor do item
      const totalValue = items.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
      if (totalValue === 0) {
        return items.map(() => totalFreight / items.length);
      }
      return items.map(item => ((item.valorTotal || 0) / totalValue) * totalFreight);
  }
}

/**
 * Calcula os custos de todos os itens da NF-e com frete rateado
 */
export function calculateAllItemCosts(
  items: NFEItem[],
  totalFreight: number,
  rateMethod: 'value' | 'weight' | 'equal' = 'value',
  weights?: number[]
): CostBreakdown[] {
  const ratedFreights = rateFreightToItems(items, totalFreight, rateMethod, weights);

  return items.map((item, index) => 
    calculateProductCost({
      item,
      freightPerItem: ratedFreights[index],
    })
  );
}

/**
 * Hook para cálculo de custo de produtos
 */
export function useProductCostCalculation() {
  return {
    calculateProductCost,
    rateFreightToItems,
    calculateAllItemCosts,
  };
}
