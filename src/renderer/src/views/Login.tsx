import type { FormEvent } from "react";
import { useState } from "react";
import { signIn } from "../lib/auth";

export function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (await signIn(password)) {
      onAuthenticated();
      return;
    }
    setError("Nesprávné heslo.");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark">✓</div>
        <h1>Kniha jízd</h1>
        <p>Přístup je chráněný heslem.</p>
        <form onSubmit={submit}>
          <label>
            <span>Heslo</span>
            <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="primary" type="submit">Přihlásit</button>
        </form>
      </section>
    </main>
  );
}
