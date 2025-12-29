// API pública para consulta de CNPJ (ReceitaWS)
export interface CnpjData {
  cnpj: string;
  nome: string;
  fantasia: string;
  situacao: string;
  data_situacao: string;
  abertura: string;
  tipo: string;
  porte: string;
  natureza_juridica: string;
  atividade_principal: { code: string; text: string }[];
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
}

export async function consultarCnpj(cnpj: string): Promise<CnpjData | null> {
  // Remove formatação do CNPJ
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    return null;
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultar-cnpj`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cnpj: cnpjLimpo }),
    });
    
    if (!response.ok) {
      throw new Error('Erro na consulta');
    }

    const data = await response.json();

    if (data.error) {
      return null;
    }

    return data as CnpjData;
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return null;
  }
}

// API pública para consulta de CEP (ViaCEP)
export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export async function consultarCep(cep: string): Promise<CepData | null> {
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro na consulta');
    }

    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return data as CepData;
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    return null;
  }
}
