"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSession } from "@/components/auth/AppSession";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/meet", label: "Meet" },
  { href: "/files", label: "Files" },
  { href: "/cinema", label: "Watch" },
  { href: "/contact", label: "Contact Together" }
];

function navClass(pathname, href) {
  if (href === "/") return pathname === "/" ? "app-nav-link active" : "app-nav-link";
  return pathname.startsWith(href) ? "app-nav-link active" : "app-nav-link";
}

export default function AppChrome({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAppSession();
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    try {
      setDark(window.localStorage.getItem("ts_theme_dark") === "1");
    } catch {
      setDark(false);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", dark);
    try {
      window.localStorage.setItem("ts_theme_dark", dark ? "1" : "0");
    } catch {}
  }, [dark]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!profileOpen) return;
      const target = event.target;
      if (profileMenuRef.current?.contains(target)) return;
      if (profileButtonRef.current?.contains(target)) return;
      setProfileOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  const userInitial = useMemo(() => (user?.username || "?").trim().charAt(0).toUpperCase(), [user]);

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-left">
          <Link href="/" className="app-brand">
            Together Space
          </Link>
          <nav className="app-nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={navClass(pathname, item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="app-header-right">
          <button className="button ghost app-mini-btn" type="button" onClick={() => setDark((prev) => !prev)}>
            {dark ? "Light" : "Dark"}
          </button>
          <button
            ref={profileButtonRef}
            className="app-profile-btn"
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <span>{userInitial}</span>
          </button>
          <button className="button app-mini-btn" type="button" onClick={logout}>
            Logout
          </button>
          {profileOpen ? (
            <div className="app-profile-menu" ref={profileMenuRef}>
              <strong>{user?.username || "User"}</strong>
              <small>{user?.email || "No email"}</small>
              <small>@{user?.public_id || "not-set"}</small>
            </div>
          ) : null}
        </div>
      </header>
      <div className="app-content">{children}</div>
    </div>
  );
}
