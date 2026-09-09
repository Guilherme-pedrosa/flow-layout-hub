// Usuário técnico "API GC WEDO", confirmado no GestãoClick.
export const GC_API_USER_ID = "1320473";

export function forceGcApiUserInUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set("usuario_id", GC_API_USER_ID);
  return url.toString();
}

