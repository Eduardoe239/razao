import { uid } from "./uid.js";

export function runUIDTests(assert) {
  const id1 = uid();
  const id2 = uid();

  assert.ok(typeof id1 === "string" && id1.length >= 20, "UUID gerado deve ser uma string válida");
  assert.notStrictEqual(id1, id2, "Dois UUIDs gerados em sequência devem ser únicos");
}
