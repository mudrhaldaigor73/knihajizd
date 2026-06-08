const password = "knihajizd";

export const usesDefaultPassword = true;

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
