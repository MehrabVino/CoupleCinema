"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  authConfirmEmail,
  authLogin,
  authRegister,
  fetchMe,
  tokenClear,
  tokenGet,
  tokenSet
} from "@/lib/api";

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
        setInfo("Verification code sent to your Gmail.");
        setMode("confirm");
        return;
      }
      await onConfirm((pendingEmail || email).trim().toLowerCase(), code.trim());
      setInfo("Email confirmed. Please login.");
      setMode("login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-auth-shell">
      <form className="app-auth-card" onSubmit={submit}>
        <p className="eyebrow">CoupleCinema Platform</p>
        <h1>{mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Confirm Email"}</h1>
        <p className="muted">Sign in with Gmail to continue to all apps.</p>

        {mode !== "confirm" ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            required
          />
        ) : (
          <input value={pendingEmail || email} onChange={(e) => setPendingEmail(e.target.value)} placeholder="you@gmail.com" required />
        )}
        {mode === "signup" ? (
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required />
        ) : null}
        {mode === "confirm" ? (
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="verification code" required />
        ) : (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
          />
        )}

        {info ? <div className="muted">{info}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <button className="button" type="submit">
          {mode === "login" ? "Login" : mode === "signup" ? "Sign Up" : "Confirm"}
        </button>
        <div className="row">
          <button type="button" className="button ghost" onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className="button ghost" onClick={() => setMode("signup")}>
            Sign Up
          </button>
          <button type="button" className="button ghost" onClick={() => setMode("confirm")}>
            Confirm
          </button>
        </div>
      </form>
    </main>
  );
}

export function AppSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const token = tokenGet();
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me.user);
      } catch {
        tokenClear();
        setUser(null);
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);

  async function login(email, password) {
    const data = await authLogin(email, password);
    tokenSet(data.token);
    setUser(data.user);
  }

  async function register(email, username, password) {
    return authRegister(email, username, password);
  }

  async function confirm(email, code) {
    return authConfirmEmail(email, code);
  }

  function logout() {
    tokenClear();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, ready, login, register, confirm, logout }),
    [user, ready]
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

