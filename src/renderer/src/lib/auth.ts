// Pozor: jde o klientskou zábranu, ne o skutečné zabezpečení.
// Heslo je součástí veřejného JS bundle. Pro silné řízení přístupu
// použijte Cloudflare Access (viz README).
const password = "knihajizd";

export function isAuthenticated() {
  return false;
}

export function signOut() {
  return;
}

export async function signIn(candidate: string) {
  if (candidate !== password) return false;
  return true;
}
