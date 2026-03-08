"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getClientServices } from "@/lib/client/factories/createClientServices";

const SessionContext = createContext(null);

function ModernAuthCard({ onLogin, onRegister, onConfirm }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      if (mode === "login") {
        await onLogin(email.trim().toLowerCase(), password);
        return;
      }
      if (mode === "signup") {
        const data = await onRegister(email.trim().toLowerCase(), username.trim(), password);
        setPendingEmail(data.email || email.trim().toLowerCase());
        setInfo("We sent a verification code to your email.");
        setMode("confirm");
        return;
      }
      await onConfirm((pendingEmail || email).trim().toLowerCase(), code.trim());
      setInfo("Email confirmed. You can sign in now.");
      setMode("login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-auth-shell">
      <form className="app-auth-card" onSubmit={submit}>
        <p className="eyebrow">Together Space</p>
        <h1>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Verify your email"}</h1>
        <p className="muted">Sign in to chat, meet, share files, and watch together.</p>

        {mode !== "confirm" ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        ) : (
          <input value={pendingEmail || email} onChange={(e) => setPendingEmail(e.target.value)} placeholder="Email" required />
        )}
        {mode === "signup" ? (
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        ) : null}
        {mode === "confirm" ? (
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" required />
        ) : (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        )}

        {info ? <div className="muted">{info}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <button className="button" type="submit">
          {mode === "login" ? "Continue" : mode === "signup" ? "Create account" : "Verify code"}
        </button>
        <div className="row">
          <button type="button" className="button ghost" onClick={() => setMode("login")}>
            Sign in
          </button>
          <button type="button" className="button ghost" onClick={() => setMode("signup")}>
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}

export function AppSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [services] = useState(() => getClientServices());

  useEffect(() => {
    async function init() {
      const restoredUser = await services.sessionService.restore();
      setUser(restoredUser);
      setReady(true);
    }
    init();
  }, [services]);

  async function login(email, password) {
    const nextUser = await services.sessionService.login(email, password);
    setUser(nextUser);
  }

  async function register(email, username, password) {
    return services.sessionService.register(email, username, password);
  }

  async function confirm(email, code) {
    return services.sessionService.confirm(email, code);
  }

  function logout() {
    services.sessionService.logout();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, ready, login, register, confirm, logout, services }),
    [user, ready, services]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function AppSessionGate({ children }) {
  const session = useAppSession();
  if (!session.ready) return null;
  if (!session.user) {
    return (
      <ModernAuthCard
        onLogin={session.login}
        onRegister={session.register}
        onConfirm={session.confirm}
      />
    );
  }
  return children;
}

export function useAppSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAppSession must be used inside AppSessionProvider");
  return ctx;
}
