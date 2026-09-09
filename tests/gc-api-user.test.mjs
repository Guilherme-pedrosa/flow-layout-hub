import assert from "node:assert/strict";
import { test } from "node:test";
import { forceGcApiUserInUrl, GC_API_USER_ID } from "../supabase/functions/_shared/gc-user.ts";

for (const supplied of ["", "&usuario_id=", "&usuario_id=%20", "&usuario_id=null", "&usuario_id=1023771", "&usuario_id=1023771&usuario_id="]) {
  test(`migration identifies technical user for query ${supplied || "(absent)"}`, () => {
    const url = new URL(forceGcApiUserInUrl(`https://gestaoclick.com/api/clientes?pagina=7${supplied}`));
    assert.deepEqual(url.searchParams.getAll("usuario_id"), [GC_API_USER_ID]);
    assert.equal(url.searchParams.get("pagina"), "7");
    assert.equal(url.pathname, "/api/clientes");
  });
}

