// CFOPs de Entrada válidos conforme Receita Federal
// Organizados por tipo de operação

export interface CFOPOption {
  codigo: string;
  descricao: string;
  grupo: string;
}

// CFOPs de Entrada - Operações Estaduais (1xxx)
export const CFOPS_ENTRADA_ESTADUAL: CFOPOption[] = [
  // Compras
  { codigo: "1101", descricao: "Compra para industrialização ou produção rural", grupo: "Compras" },
  { codigo: "1102", descricao: "Compra para comercialização", grupo: "Compras" },
  { codigo: "1111", descricao: "Compra para industrialização de mercadoria recebida anteriormente em consignação industrial", grupo: "Compras" },
  { codigo: "1113", descricao: "Compra para comercialização, de mercadoria recebida anteriormente em consignação mercantil", grupo: "Compras" },
  { codigo: "1116", descricao: "Compra para industrialização originada de encomenda para recebimento futuro", grupo: "Compras" },
  { codigo: "1117", descricao: "Compra para comercialização originada de encomenda para recebimento futuro", grupo: "Compras" },
  { codigo: "1118", descricao: "Compra de mercadoria para comercialização pelo adquirente originário, entregue pelo vendedor remetente ao destinatário", grupo: "Compras" },
  { codigo: "1120", descricao: "Compra para industrialização, em venda à ordem, já recebida do vendedor remetente", grupo: "Compras" },
  { codigo: "1121", descricao: "Compra para comercialização, em venda à ordem, já recebida do vendedor remetente", grupo: "Compras" },
  { codigo: "1122", descricao: "Compra para industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador", grupo: "Compras" },
  { codigo: "1124", descricao: "Industrialização efetuada por outra empresa", grupo: "Compras" },
  { codigo: "1125", descricao: "Industrialização efetuada por outra empresa quando a mercadoria remetida para utilização no processo", grupo: "Compras" },
  { codigo: "1126", descricao: "Compra para utilização na prestação de serviço sujeita ao ICMS", grupo: "Compras" },
  { codigo: "1128", descricao: "Compra para utilização na prestação de serviço sujeita ao ISSQN", grupo: "Compras" },
  
  // Transferências
  { codigo: "1151", descricao: "Transferência para industrialização ou produção rural", grupo: "Transferências" },
  { codigo: "1152", descricao: "Transferência para comercialização", grupo: "Transferências" },
  { codigo: "1153", descricao: "Transferência de energia elétrica para distribuição", grupo: "Transferências" },
  { codigo: "1154", descricao: "Transferência para utilização na prestação de serviço", grupo: "Transferências" },
  { codigo: "1159", descricao: "Entrada decorrente do fornecimento de produto ou mercadoria de ato cooperativo", grupo: "Transferências" },
  
  // Devoluções
  { codigo: "1201", descricao: "Devolução de venda de produção do estabelecimento", grupo: "Devoluções" },
  { codigo: "1202", descricao: "Devolução de venda de mercadoria adquirida ou recebida de terceiros", grupo: "Devoluções" },
  { codigo: "1203", descricao: "Devolução de venda de produção do estabelecimento, destinada à Zona Franca de Manaus", grupo: "Devoluções" },
  { codigo: "1204", descricao: "Devolução de venda de mercadoria adquirida ou recebida de terceiros, destinada à Zona Franca de Manaus", grupo: "Devoluções" },
  { codigo: "1205", descricao: "Anulação de valor relativo à prestação de serviço de comunicação", grupo: "Devoluções" },
  { codigo: "1206", descricao: "Anulação de valor relativo à prestação de serviço de transporte", grupo: "Devoluções" },
  { codigo: "1207", descricao: "Anulação de valor relativo à venda de energia elétrica", grupo: "Devoluções" },
  { codigo: "1208", descricao: "Devolução de produção do estabelecimento, remetida em transferência", grupo: "Devoluções" },
  { codigo: "1209", descricao: "Devolução de mercadoria adquirida ou recebida de terceiros, remetida em transferência", grupo: "Devoluções" },
  
  // Aquisição de serviços
  { codigo: "1251", descricao: "Compra de energia elétrica para distribuição ou comercialização", grupo: "Serviços e Energia" },
  { codigo: "1252", descricao: "Compra de energia elétrica por estabelecimento industrial", grupo: "Serviços e Energia" },
  { codigo: "1253", descricao: "Compra de energia elétrica por estabelecimento comercial", grupo: "Serviços e Energia" },
  { codigo: "1254", descricao: "Compra de energia elétrica por estabelecimento prestador de serviço de transporte", grupo: "Serviços e Energia" },
  { codigo: "1255", descricao: "Compra de energia elétrica por estabelecimento prestador de serviço de comunicação", grupo: "Serviços e Energia" },
  { codigo: "1256", descricao: "Compra de energia elétrica por estabelecimento de produtor rural", grupo: "Serviços e Energia" },
  { codigo: "1257", descricao: "Compra de energia elétrica para consumo por demanda contratada", grupo: "Serviços e Energia" },
  
  // Ativo imobilizado e material de uso
  { codigo: "1401", descricao: "Compra para industrialização ou produção rural em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "1403", descricao: "Compra para comercialização em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "1406", descricao: "Compra de bem para o ativo imobilizado cuja mercadoria está sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "1407", descricao: "Compra de mercadoria para uso ou consumo cuja mercadoria está sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "1408", descricao: "Transferência para industrialização ou produção rural em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "1409", descricao: "Transferência para comercialização em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  
  // Ativo e Consumo
  { codigo: "1551", descricao: "Compra de bem para o ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "1552", descricao: "Transferência de bem do ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "1553", descricao: "Devolução de venda de bem do ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "1554", descricao: "Retorno de bem do ativo imobilizado remetido para uso fora do estabelecimento", grupo: "Ativo e Consumo" },
  { codigo: "1555", descricao: "Entrada de bem do ativo imobilizado de terceiro, remetido para uso no estabelecimento", grupo: "Ativo e Consumo" },
  { codigo: "1556", descricao: "Compra de material para uso ou consumo", grupo: "Ativo e Consumo" },
  { codigo: "1557", descricao: "Transferência de material para uso ou consumo", grupo: "Ativo e Consumo" },
  
  // Combustíveis
  { codigo: "1651", descricao: "Compra de combustível ou lubrificante para industrialização subsequente", grupo: "Combustíveis" },
  { codigo: "1652", descricao: "Compra de combustível ou lubrificante para comercialização", grupo: "Combustíveis" },
  { codigo: "1653", descricao: "Compra de combustível ou lubrificante por consumidor ou usuário final", grupo: "Combustíveis" },
  { codigo: "1658", descricao: "Transferência de combustível e lubrificante para industrialização", grupo: "Combustíveis" },
  { codigo: "1659", descricao: "Transferência de combustível e lubrificante para comercialização", grupo: "Combustíveis" },
  { codigo: "1660", descricao: "Devolução de venda de combustível ou lubrificante destinado à industrialização subsequente", grupo: "Combustíveis" },
  { codigo: "1661", descricao: "Devolução de venda de combustível ou lubrificante destinado à comercialização", grupo: "Combustíveis" },
  { codigo: "1662", descricao: "Devolução de venda de combustível ou lubrificante destinado a consumidor ou usuário final", grupo: "Combustíveis" },
  
  // Outras entradas
  { codigo: "1901", descricao: "Entrada para industrialização por encomenda", grupo: "Outras Entradas" },
  { codigo: "1902", descricao: "Retorno de mercadoria remetida para industrialização por encomenda", grupo: "Outras Entradas" },
  { codigo: "1903", descricao: "Entrada de mercadoria remetida para industrialização e não aplicada no referido processo", grupo: "Outras Entradas" },
  { codigo: "1904", descricao: "Retorno de remessa para venda fora do estabelecimento", grupo: "Outras Entradas" },
  { codigo: "1905", descricao: "Entrada de mercadoria recebida para depósito em depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "1906", descricao: "Retorno de mercadoria remetida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "1907", descricao: "Retorno simbólico de mercadoria remetida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "1908", descricao: "Entrada de bem por conta de contrato de comodato", grupo: "Outras Entradas" },
  { codigo: "1909", descricao: "Retorno de bem remetido por conta de contrato de comodato", grupo: "Outras Entradas" },
  { codigo: "1910", descricao: "Entrada de bonificação, doação ou brinde", grupo: "Outras Entradas" },
  { codigo: "1911", descricao: "Entrada de amostra grátis", grupo: "Outras Entradas" },
  { codigo: "1912", descricao: "Entrada de mercadoria ou bem recebido para demonstração", grupo: "Outras Entradas" },
  { codigo: "1913", descricao: "Retorno de mercadoria ou bem remetido para demonstração", grupo: "Outras Entradas" },
  { codigo: "1914", descricao: "Retorno de mercadoria ou bem remetido para exposição ou feira", grupo: "Outras Entradas" },
  { codigo: "1915", descricao: "Entrada de mercadoria ou bem recebido para conserto ou reparo", grupo: "Outras Entradas" },
  { codigo: "1916", descricao: "Retorno de mercadoria ou bem remetido para conserto ou reparo", grupo: "Outras Entradas" },
  { codigo: "1917", descricao: "Entrada de mercadoria recebida em consignação mercantil ou industrial", grupo: "Outras Entradas" },
  { codigo: "1918", descricao: "Devolução de mercadoria remetida em consignação mercantil ou industrial", grupo: "Outras Entradas" },
  { codigo: "1919", descricao: "Devolução simbólica de mercadoria vendida ou utilizada em processo industrial, remetida anteriormente em consignação", grupo: "Outras Entradas" },
  { codigo: "1920", descricao: "Entrada de vasilhame ou sacaria", grupo: "Outras Entradas" },
  { codigo: "1921", descricao: "Retorno de vasilhame ou sacaria", grupo: "Outras Entradas" },
  { codigo: "1922", descricao: "Lançamento efetuado a título de simples faturamento decorrente de compra para recebimento futuro", grupo: "Outras Entradas" },
  { codigo: "1923", descricao: "Entrada de mercadoria recebida do vendedor remetente, em venda à ordem", grupo: "Outras Entradas" },
  { codigo: "1924", descricao: "Entrada para industrialização por conta e ordem do adquirente da mercadoria", grupo: "Outras Entradas" },
  { codigo: "1925", descricao: "Retorno de mercadoria remetida para industrialização por conta e ordem do adquirente", grupo: "Outras Entradas" },
  { codigo: "1926", descricao: "Lançamento efetuado a título de reclassificação de mercadoria decorrente de formação de kit", grupo: "Outras Entradas" },
  { codigo: "1931", descricao: "Lançamento efetuado pelo tomador do serviço de transporte quando a responsabilidade de retenção do ICMS for atribuída ao remetente", grupo: "Outras Entradas" },
  { codigo: "1932", descricao: "Aquisição de serviço de transporte iniciado em UF diversa daquela onde inscrito o prestador", grupo: "Outras Entradas" },
  { codigo: "1933", descricao: "Aquisição de serviço tributado pelo ISSQN", grupo: "Outras Entradas" },
  { codigo: "1934", descricao: "Entrada simbólica de mercadoria recebida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "1949", descricao: "Outra entrada de mercadoria ou prestação de serviço não especificada", grupo: "Outras Entradas" },
];

// CFOPs de Entrada - Operações Interestaduais (2xxx)
export const CFOPS_ENTRADA_INTERESTADUAL: CFOPOption[] = [
  // Compras
  { codigo: "2101", descricao: "Compra para industrialização ou produção rural", grupo: "Compras" },
  { codigo: "2102", descricao: "Compra para comercialização", grupo: "Compras" },
  { codigo: "2111", descricao: "Compra para industrialização de mercadoria recebida anteriormente em consignação industrial", grupo: "Compras" },
  { codigo: "2113", descricao: "Compra para comercialização, de mercadoria recebida anteriormente em consignação mercantil", grupo: "Compras" },
  { codigo: "2116", descricao: "Compra para industrialização originada de encomenda para recebimento futuro", grupo: "Compras" },
  { codigo: "2117", descricao: "Compra para comercialização originada de encomenda para recebimento futuro", grupo: "Compras" },
  { codigo: "2118", descricao: "Compra de mercadoria para comercialização pelo adquirente originário, entregue pelo vendedor remetente ao destinatário", grupo: "Compras" },
  { codigo: "2120", descricao: "Compra para industrialização, em venda à ordem, já recebida do vendedor remetente", grupo: "Compras" },
  { codigo: "2121", descricao: "Compra para comercialização, em venda à ordem, já recebida do vendedor remetente", grupo: "Compras" },
  { codigo: "2122", descricao: "Compra para industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador", grupo: "Compras" },
  { codigo: "2124", descricao: "Industrialização efetuada por outra empresa", grupo: "Compras" },
  { codigo: "2125", descricao: "Industrialização efetuada por outra empresa quando a mercadoria remetida para utilização no processo", grupo: "Compras" },
  { codigo: "2126", descricao: "Compra para utilização na prestação de serviço sujeita ao ICMS", grupo: "Compras" },
  { codigo: "2128", descricao: "Compra para utilização na prestação de serviço sujeita ao ISSQN", grupo: "Compras" },
  
  // Transferências
  { codigo: "2151", descricao: "Transferência para industrialização ou produção rural", grupo: "Transferências" },
  { codigo: "2152", descricao: "Transferência para comercialização", grupo: "Transferências" },
  { codigo: "2153", descricao: "Transferência de energia elétrica para distribuição", grupo: "Transferências" },
  { codigo: "2154", descricao: "Transferência para utilização na prestação de serviço", grupo: "Transferências" },
  { codigo: "2159", descricao: "Entrada decorrente do fornecimento de produto ou mercadoria de ato cooperativo", grupo: "Transferências" },
  
  // Devoluções
  { codigo: "2201", descricao: "Devolução de venda de produção do estabelecimento", grupo: "Devoluções" },
  { codigo: "2202", descricao: "Devolução de venda de mercadoria adquirida ou recebida de terceiros", grupo: "Devoluções" },
  { codigo: "2203", descricao: "Devolução de venda de produção do estabelecimento, destinada à Zona Franca de Manaus", grupo: "Devoluções" },
  { codigo: "2204", descricao: "Devolução de venda de mercadoria adquirida ou recebida de terceiros, destinada à Zona Franca de Manaus", grupo: "Devoluções" },
  { codigo: "2205", descricao: "Anulação de valor relativo à prestação de serviço de comunicação", grupo: "Devoluções" },
  { codigo: "2206", descricao: "Anulação de valor relativo à prestação de serviço de transporte", grupo: "Devoluções" },
  { codigo: "2207", descricao: "Anulação de valor relativo à venda de energia elétrica", grupo: "Devoluções" },
  { codigo: "2208", descricao: "Devolução de produção do estabelecimento, remetida em transferência", grupo: "Devoluções" },
  { codigo: "2209", descricao: "Devolução de mercadoria adquirida ou recebida de terceiros, remetida em transferência", grupo: "Devoluções" },
  
  // Substituição Tributária
  { codigo: "2401", descricao: "Compra para industrialização ou produção rural em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "2403", descricao: "Compra para comercialização em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "2406", descricao: "Compra de bem para o ativo imobilizado cuja mercadoria está sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "2407", descricao: "Compra de mercadoria para uso ou consumo cuja mercadoria está sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "2408", descricao: "Transferência para industrialização ou produção rural em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  { codigo: "2409", descricao: "Transferência para comercialização em operação com mercadoria sujeita ao ST", grupo: "Substituição Tributária" },
  
  // Ativo e Consumo
  { codigo: "2551", descricao: "Compra de bem para o ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "2552", descricao: "Transferência de bem do ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "2553", descricao: "Devolução de venda de bem do ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "2554", descricao: "Retorno de bem do ativo imobilizado remetido para uso fora do estabelecimento", grupo: "Ativo e Consumo" },
  { codigo: "2555", descricao: "Entrada de bem do ativo imobilizado de terceiro, remetido para uso no estabelecimento", grupo: "Ativo e Consumo" },
  { codigo: "2556", descricao: "Compra de material para uso ou consumo", grupo: "Ativo e Consumo" },
  { codigo: "2557", descricao: "Transferência de material para uso ou consumo", grupo: "Ativo e Consumo" },
  
  // Combustíveis
  { codigo: "2651", descricao: "Compra de combustível ou lubrificante para industrialização subsequente", grupo: "Combustíveis" },
  { codigo: "2652", descricao: "Compra de combustível ou lubrificante para comercialização", grupo: "Combustíveis" },
  { codigo: "2653", descricao: "Compra de combustível ou lubrificante por consumidor ou usuário final", grupo: "Combustíveis" },
  { codigo: "2658", descricao: "Transferência de combustível e lubrificante para industrialização", grupo: "Combustíveis" },
  { codigo: "2659", descricao: "Transferência de combustível e lubrificante para comercialização", grupo: "Combustíveis" },
  { codigo: "2660", descricao: "Devolução de venda de combustível ou lubrificante destinado à industrialização subsequente", grupo: "Combustíveis" },
  { codigo: "2661", descricao: "Devolução de venda de combustível ou lubrificante destinado à comercialização", grupo: "Combustíveis" },
  { codigo: "2662", descricao: "Devolução de venda de combustível ou lubrificante destinado a consumidor ou usuário final", grupo: "Combustíveis" },
  
  // Outras entradas
  { codigo: "2901", descricao: "Entrada para industrialização por encomenda", grupo: "Outras Entradas" },
  { codigo: "2902", descricao: "Retorno de mercadoria remetida para industrialização por encomenda", grupo: "Outras Entradas" },
  { codigo: "2903", descricao: "Entrada de mercadoria remetida para industrialização e não aplicada no referido processo", grupo: "Outras Entradas" },
  { codigo: "2904", descricao: "Retorno de remessa para venda fora do estabelecimento", grupo: "Outras Entradas" },
  { codigo: "2905", descricao: "Entrada de mercadoria recebida para depósito em depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "2906", descricao: "Retorno de mercadoria remetida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "2907", descricao: "Retorno simbólico de mercadoria remetida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "2908", descricao: "Entrada de bem por conta de contrato de comodato", grupo: "Outras Entradas" },
  { codigo: "2909", descricao: "Retorno de bem remetido por conta de contrato de comodato", grupo: "Outras Entradas" },
  { codigo: "2910", descricao: "Entrada de bonificação, doação ou brinde", grupo: "Outras Entradas" },
  { codigo: "2911", descricao: "Entrada de amostra grátis", grupo: "Outras Entradas" },
  { codigo: "2912", descricao: "Entrada de mercadoria ou bem recebido para demonstração", grupo: "Outras Entradas" },
  { codigo: "2913", descricao: "Retorno de mercadoria ou bem remetido para demonstração", grupo: "Outras Entradas" },
  { codigo: "2914", descricao: "Retorno de mercadoria ou bem remetido para exposição ou feira", grupo: "Outras Entradas" },
  { codigo: "2915", descricao: "Entrada de mercadoria ou bem recebido para conserto ou reparo", grupo: "Outras Entradas" },
  { codigo: "2916", descricao: "Retorno de mercadoria ou bem remetido para conserto ou reparo", grupo: "Outras Entradas" },
  { codigo: "2917", descricao: "Entrada de mercadoria recebida em consignação mercantil ou industrial", grupo: "Outras Entradas" },
  { codigo: "2918", descricao: "Devolução de mercadoria remetida em consignação mercantil ou industrial", grupo: "Outras Entradas" },
  { codigo: "2919", descricao: "Devolução simbólica de mercadoria vendida ou utilizada em processo industrial, remetida anteriormente em consignação", grupo: "Outras Entradas" },
  { codigo: "2920", descricao: "Entrada de vasilhame ou sacaria", grupo: "Outras Entradas" },
  { codigo: "2921", descricao: "Retorno de vasilhame ou sacaria", grupo: "Outras Entradas" },
  { codigo: "2922", descricao: "Lançamento efetuado a título de simples faturamento decorrente de compra para recebimento futuro", grupo: "Outras Entradas" },
  { codigo: "2923", descricao: "Entrada de mercadoria recebida do vendedor remetente, em venda à ordem", grupo: "Outras Entradas" },
  { codigo: "2924", descricao: "Entrada para industrialização por conta e ordem do adquirente da mercadoria", grupo: "Outras Entradas" },
  { codigo: "2925", descricao: "Retorno de mercadoria remetida para industrialização por conta e ordem do adquirente", grupo: "Outras Entradas" },
  { codigo: "2931", descricao: "Lançamento efetuado pelo tomador do serviço de transporte quando a responsabilidade de retenção do ICMS for atribuída ao remetente", grupo: "Outras Entradas" },
  { codigo: "2932", descricao: "Aquisição de serviço de transporte iniciado em UF diversa daquela onde inscrito o prestador", grupo: "Outras Entradas" },
  { codigo: "2933", descricao: "Aquisição de serviço tributado pelo ISSQN", grupo: "Outras Entradas" },
  { codigo: "2934", descricao: "Entrada simbólica de mercadoria recebida para depósito fechado ou armazém geral", grupo: "Outras Entradas" },
  { codigo: "2949", descricao: "Outra entrada de mercadoria ou prestação de serviço não especificada", grupo: "Outras Entradas" },
];

// CFOPs de Entrada - Operações Exterior (3xxx)
export const CFOPS_ENTRADA_EXTERIOR: CFOPOption[] = [
  { codigo: "3101", descricao: "Compra para industrialização ou produção rural", grupo: "Compras" },
  { codigo: "3102", descricao: "Compra para comercialização", grupo: "Compras" },
  { codigo: "3126", descricao: "Compra para utilização na prestação de serviço sujeita ao ICMS", grupo: "Compras" },
  { codigo: "3127", descricao: "Compra para industrialização sob o regime de drawback", grupo: "Compras" },
  { codigo: "3128", descricao: "Compra para utilização na prestação de serviço sujeita ao ISSQN", grupo: "Compras" },
  { codigo: "3201", descricao: "Devolução de venda de produção do estabelecimento", grupo: "Devoluções" },
  { codigo: "3202", descricao: "Devolução de venda de mercadoria adquirida ou recebida de terceiros", grupo: "Devoluções" },
  { codigo: "3205", descricao: "Anulação de valor relativo à prestação de serviço de comunicação", grupo: "Devoluções" },
  { codigo: "3206", descricao: "Anulação de valor relativo à prestação de serviço de transporte", grupo: "Devoluções" },
  { codigo: "3207", descricao: "Anulação de valor relativo à venda de energia elétrica", grupo: "Devoluções" },
  { codigo: "3211", descricao: "Devolução de venda de produção do estabelecimento sob o regime de drawback", grupo: "Devoluções" },
  { codigo: "3251", descricao: "Compra de energia elétrica para distribuição ou comercialização", grupo: "Serviços e Energia" },
  { codigo: "3301", descricao: "Aquisição de serviço de comunicação para execução de serviço da mesma natureza", grupo: "Serviços e Energia" },
  { codigo: "3351", descricao: "Aquisição de serviço de transporte para execução de serviço da mesma natureza", grupo: "Serviços e Energia" },
  { codigo: "3352", descricao: "Aquisição de serviço de transporte por estabelecimento industrial", grupo: "Serviços e Energia" },
  { codigo: "3353", descricao: "Aquisição de serviço de transporte por estabelecimento comercial", grupo: "Serviços e Energia" },
  { codigo: "3354", descricao: "Aquisição de serviço de transporte por estabelecimento de prestador de serviço de comunicação", grupo: "Serviços e Energia" },
  { codigo: "3355", descricao: "Aquisição de serviço de transporte por estabelecimento de geradora ou de distribuidora de energia elétrica", grupo: "Serviços e Energia" },
  { codigo: "3356", descricao: "Aquisição de serviço de transporte por estabelecimento de produtor rural", grupo: "Serviços e Energia" },
  { codigo: "3551", descricao: "Compra de bem para o ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "3553", descricao: "Devolução de venda de bem do ativo imobilizado", grupo: "Ativo e Consumo" },
  { codigo: "3556", descricao: "Compra de material para uso ou consumo", grupo: "Ativo e Consumo" },
  { codigo: "3651", descricao: "Compra de combustível ou lubrificante para industrialização subsequente", grupo: "Combustíveis" },
  { codigo: "3652", descricao: "Compra de combustível ou lubrificante para comercialização", grupo: "Combustíveis" },
  { codigo: "3653", descricao: "Compra de combustível ou lubrificante por consumidor ou usuário final", grupo: "Combustíveis" },
  { codigo: "3930", descricao: "Lançamento efetuado a título de entrada de bem sob amparo de regime especial aduaneiro de admissão temporária", grupo: "Outras Entradas" },
  { codigo: "3949", descricao: "Outra entrada de mercadoria ou prestação de serviço não especificada", grupo: "Outras Entradas" },
];

// Todos os CFOPs de entrada
export const ALL_CFOPS_ENTRADA: CFOPOption[] = [
  ...CFOPS_ENTRADA_ESTADUAL,
  ...CFOPS_ENTRADA_INTERESTADUAL,
  ...CFOPS_ENTRADA_EXTERIOR,
];

// CFOPs mais comuns para facilitar seleção rápida
export const CFOPS_ENTRADA_COMUNS: CFOPOption[] = [
  { codigo: "1102", descricao: "Compra para comercialização (estadual)", grupo: "Mais Usados" },
  { codigo: "2102", descricao: "Compra para comercialização (interestadual)", grupo: "Mais Usados" },
  { codigo: "1101", descricao: "Compra para industrialização (estadual)", grupo: "Mais Usados" },
  { codigo: "2101", descricao: "Compra para industrialização (interestadual)", grupo: "Mais Usados" },
  { codigo: "1403", descricao: "Compra para comercialização - ST (estadual)", grupo: "Mais Usados" },
  { codigo: "2403", descricao: "Compra para comercialização - ST (interestadual)", grupo: "Mais Usados" },
  { codigo: "1556", descricao: "Compra de material para uso ou consumo (estadual)", grupo: "Mais Usados" },
  { codigo: "2556", descricao: "Compra de material para uso ou consumo (interestadual)", grupo: "Mais Usados" },
  { codigo: "1551", descricao: "Compra de bem para ativo imobilizado (estadual)", grupo: "Mais Usados" },
  { codigo: "2551", descricao: "Compra de bem para ativo imobilizado (interestadual)", grupo: "Mais Usados" },
  { codigo: "1949", descricao: "Outra entrada não especificada (estadual)", grupo: "Mais Usados" },
  { codigo: "2949", descricao: "Outra entrada não especificada (interestadual)", grupo: "Mais Usados" },
];

// CFOPs que NÃO geram contas a pagar (garantia, remessa, conserto, demonstração, etc.)
export const CFOPS_SEM_FINANCEIRO: string[] = [
  // Retornos de remessa/conserto/demonstração - Estadual
  "1902", "1903", "1904", "1906", "1907", "1909", "1913", "1914", "1916", "1921",
  // Retornos de remessa/conserto/demonstração - Interestadual  
  "2902", "2903", "2904", "2906", "2907", "2909", "2913", "2914", "2916", "2921",
  // Entradas para industrialização por encomenda (não é compra)
  "1901", "1924", "2901", "2924",
  // Entrada de mercadoria em consignação
  "1917", "2917",
  // Entradas para depósito
  "1905", "1934", "2905", "2934",
  // Comodato
  "1908", "2908",
  // Recebido para demonstração/conserto (não é compra)
  "1912", "1915", "2912", "2915",
  // Bonificação/doação/brinde/amostra (não gera pagamento)
  "1910", "1911", "2910", "2911",
  // Vasilhame/sacaria
  "1920", "2920",
  // Simples faturamento (não é a mercadoria ainda)
  "1922", "2922",
  // Reclassificação
  "1926",
  // Genéricos de "outras entradas" que podem ser garantia/remessa
  "1949", "2949", "3949",
];

// CFOPs de compra/comercialização que GERAM contas a pagar
export const CFOPS_COMERCIAIS: string[] = [
  // Compras - Estadual
  "1101", "1102", "1111", "1113", "1116", "1117", "1118", "1120", "1121", "1122", "1124", "1125", "1126", "1128",
  // Compras - Interestadual
  "2101", "2102", "2111", "2113", "2116", "2117", "2118", "2120", "2121", "2122", "2124", "2125", "2126", "2128",
  // Compras - Exterior
  "3101", "3102", "3126", "3127", "3128",
  // Compras ST
  "1401", "1403", "1406", "1407", "2401", "2403", "2406", "2407",
  // Ativo imobilizado (é compra)
  "1551", "2551", "3551",
  // Material de uso/consumo (é compra)
  "1556", "2556", "3556",
  // Combustíveis
  "1651", "1652", "1653", "2651", "2652", "2653", "3651", "3652", "3653",
  // Energia elétrica
  "1251", "1252", "1253", "1254", "1255", "1256", "1257",
  // Transferências (podem gerar financeiro entre filiais)
  "1151", "1152", "1153", "1154", "2151", "2152", "2153", "2154",
];

// Mapeamento de finalidade para CFOPs permitidos
export const CFOPS_POR_FINALIDADE: Record<string, { permitidos: string[]; bloqueados: string[] }> = {
  // Estoque/Revenda: CFOPs de compra para comercialização
  estoque: {
    permitidos: ["1102", "2102", "3102", "1403", "2403", "1117", "2117", "1121", "2121"],
    bloqueados: ["1949", "2949", "1916", "2916", "1915", "2915"], // Garantia/conserto
  },
  // Ordem de Serviço: CFOPs de compra para industrialização/serviço
  ordem_de_servico: {
    permitidos: ["1101", "2101", "3101", "1102", "2102", "1126", "2126", "1128", "2128", "1401", "2401", "1403", "2403"],
    bloqueados: ["1949", "2949"],
  },
  // Garantia: CFOPs de retorno/conserto
  garantia: {
    permitidos: ["1916", "2916", "1949", "2949", "1915", "2915", "1913", "2913"],
    bloqueados: ["1102", "2102", "1101", "2101", "1403", "2403"], // CFOPs de compra
  },
  // Despesa operacional: Uso/consumo e ativo
  despesa_operacional: {
    permitidos: ["1556", "2556", "3556", "1551", "2551", "3551", "1407", "2407"],
    bloqueados: [],
  },
};

/**
 * Verifica se o CFOP gera contas a pagar (é uma operação comercial)
 */
export function cfopGeraFinanceiro(cfop: string): boolean {
  // Se está na lista de CFOPs sem financeiro, não gera
  if (CFOPS_SEM_FINANCEIRO.includes(cfop)) {
    return false;
  }
  // Se está na lista de CFOPs comerciais, gera
  if (CFOPS_COMERCIAIS.includes(cfop)) {
    return true;
  }
  // Default: assume que gera para segurança
  return true;
}

/**
 * Valida se o CFOP é compatível com a finalidade selecionada
 */
export function validarCfopParaFinalidade(
  cfop: string, 
  finalidade: string
): { valido: boolean; mensagem?: string } {
  const regras = CFOPS_POR_FINALIDADE[finalidade];
  
  if (!regras) {
    return { valido: true }; // Sem regras definidas, permite
  }
  
  // Verifica se está bloqueado para esta finalidade
  if (regras.bloqueados.includes(cfop)) {
    const cfopInfo = ALL_CFOPS_ENTRADA.find(c => c.codigo === cfop);
    const cfopDesc = cfopInfo ? `${cfop} - ${cfopInfo.descricao}` : cfop;
    
    if (finalidade === "garantia") {
      return {
        valido: false,
        mensagem: `O CFOP ${cfopDesc} é de compra/comercialização e não pode ser usado para entrada de garantia. Use CFOPs de retorno como 1916/2916.`,
      };
    }
    if (finalidade === "estoque" || finalidade === "ordem_de_servico") {
      return {
        valido: false,
        mensagem: `O CFOP ${cfopDesc} é de garantia/remessa e não pode ser usado para entrada de mercadoria para ${finalidade === "estoque" ? "estoque" : "ordem de serviço"}. Use CFOPs de compra como 1102/2102.`,
      };
    }
  }
  
  return { valido: true };
}

/**
 * Verifica se a NF-e pode entrar como garantia baseado no CFOP de saída do fornecedor
 */
export function podeEntrarComoGarantia(cfopSaidaFornecedor: string): boolean {
  // CFOPs de saída que indicam garantia/remessa para conserto
  const cfopsSaidaGarantia = [
    "5916", "6916", // Retorno de mercadoria recebida para conserto/reparo
    "5949", "6949", // Outra saída (pode ser garantia)
    "5915", "6915", // Remessa para conserto
    "5913", "6913", // Retorno de demonstração
  ];
  
  return cfopsSaidaGarantia.includes(cfopSaidaFornecedor);
}

/**
 * Verifica se a NF-e é de comercialização baseado no CFOP de saída do fornecedor
 */
export function nfeEhComercial(cfopSaidaFornecedor: string): boolean {
  // CFOPs de saída que indicam venda/comercialização
  const cfopsSaidaVenda = [
    "5101", "5102", "5103", "5104", "5105", "5106",
    "6101", "6102", "6103", "6104", "6105", "6106", "6107", "6108", "6109",
    "7101", "7102",
    "5401", "5403", "6401", "6403", // ST
    "5501", "5502", "6501", "6502", // Remessa com fim específico de exportação
  ];
  
  return cfopsSaidaVenda.includes(cfopSaidaFornecedor);
}

// Função para sugerir CFOP de entrada baseado no CFOP de saída
export function sugerirCfopEntrada(cfopSaida: string): string {
  const cfopSaidaNum = parseInt(cfopSaida);
  
  // Mapeamento de CFOP saída para entrada
  const mapeamento: Record<number, string> = {
    // Vendas para comercialização
    5102: "1102", 6102: "2102", 7102: "3102",
    5101: "1101", 6101: "2101", 7101: "3101",
    // Vendas ST
    5403: "1403", 6403: "2403",
    5401: "1401", 6401: "2401",
    // Transferências
    5152: "1152", 6152: "2152",
    5151: "1151", 6151: "2151",
    // Ativo
    5551: "1551", 6551: "2551", 7551: "3551",
    // Consumo
    5556: "1556", 6556: "2556", 7556: "3556",
    // Garantia/Conserto
    5916: "1916", 6916: "2916",
    5915: "1915", 6915: "2915",
    5949: "1949", 6949: "2949",
  };
  
  if (mapeamento[cfopSaidaNum]) {
    return mapeamento[cfopSaidaNum];
  }
  
  // Sugestão padrão baseada no prefixo
  const prefixoSaida = cfopSaida.charAt(0);
  if (prefixoSaida === "5") return "1102"; // Estadual
  if (prefixoSaida === "6") return "2102"; // Interestadual
  if (prefixoSaida === "7") return "3102"; // Exterior
  
  return "1949"; // Genérico
}
