import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  valid: boolean;
  userId?: string;
  companyId?: string;
  error?: string;
  status: number;
}

/**
 * Valida autenticação do usuário e acesso à empresa
 * 
 * @param req - Request HTTP
 * @param supabase - Cliente Supabase com service role (para validações)
 * @returns AuthResult com userId e companyId validados
 */
export async function validateAuth(
  req: Request,
  supabase: any
): Promise<AuthResult> {
  // 1. Verificar header de autorização
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      error: "Não autorizado - Token não fornecido",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  // 2. Criar cliente com token do usuário para validar
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // 3. Validar token usando getClaims (método recomendado)
  try {
    const { data, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !data?.claims) {
      console.error("[auth-helper] Erro de autenticação:", claimsError?.message || "No claims");
      return {
        valid: false,
        error: "Não autorizado - Token inválido",
        status: 401,
      };
    }

    const userId = data.claims.sub as string;
    
    if (!userId) {
      console.error("[auth-helper] Erro de autenticação: No user ID in claims");
      return {
        valid: false,
        error: "Não autorizado - Token inválido",
        status: 401,
      };
    }

    // 4. Buscar empresas do usuário
    const { data: userCompanies, error: companiesError } = await supabaseAuth.rpc(
      "get_user_companies"
    );

    if (companiesError) {
      console.error("[auth-helper] Erro ao buscar empresas:", companiesError.message);
      return {
        valid: false,
        error: "Erro ao verificar permissões",
        status: 500,
      };
    }

    // Se não tem empresas vinculadas
    if (!userCompanies || userCompanies.length === 0) {
      return {
        valid: false,
        error: "Usuário sem empresa vinculada",
        status: 403,
      };
    }

    // Retornar primeira empresa como padrão (será sobrescrito se companyId vier no body)
    return {
      valid: true,
      userId: userId,
      companyId: userCompanies[0], // Primeira empresa como padrão
      status: 200,
    };
  } catch (error) {
    console.error("[auth-helper] Erro ao validar token:", error);
    return {
      valid: false,
      error: "Não autorizado - Erro ao validar token",
      status: 401,
    };
  }
}

/**
 * Valida se o usuário tem acesso a uma empresa específica
 */
export async function validateCompanyAccess(
  req: Request,
  supabase: any,
  requestedCompanyId: string
): Promise<AuthResult> {
  const authResult = await validateAuth(req, supabase);

  if (!authResult.valid) {
    return authResult;
  }

  // Buscar empresas do usuário novamente para validar acesso
  const authHeader = req.headers.get("Authorization")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userCompanies } = await supabaseAuth.rpc("get_user_companies");

  if (!userCompanies?.includes(requestedCompanyId)) {
    console.error(
      "[auth-helper] Usuário não tem acesso à empresa:",
      requestedCompanyId
    );
    return {
      valid: false,
      error: "Sem permissão para esta empresa",
      status: 403,
    };
  }

  return {
    valid: true,
    userId: authResult.userId,
    companyId: requestedCompanyId,
    status: 200,
  };
}

/**
 * Helper para retornar resposta de erro padronizada
 */
export function authErrorResponse(
  authResult: AuthResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ success: false, error: authResult.error }),
    {
      status: authResult.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
