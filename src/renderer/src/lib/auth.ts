const sessionKey = "moje-kniha-jizd:authenticated";
const password = "knihajizd";

export const usesDefaultPassword = true;

export function isAuthenticated() {
  return sessionStorage.getItem(sessionKey) === "yes";
}

export function signOut() {
  sessionStorage.removeItem(sessionKey);
}

export async function signIn(candidate: string) {
  if (candidate !== password) return false;
  sessionStorage.setItem(sessionKey, "yes");
  return true;
}
