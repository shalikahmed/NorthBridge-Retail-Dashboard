import { useEffect, useState } from "react";

const ALLOWED_EMAIL = "shaliktestmail@gmail.com";

function getCatalyst() {
  return typeof window !== "undefined" ? window.catalyst : undefined;
}

export default function AuthGate({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      // Local Vite development remains usable; production requires Catalyst auth.
      if (import.meta.env.DEV && !getCatalyst()?.auth?.isUserAuthenticated) {
        if (!cancelled) setStatus("allowed");
        return;
      }

      const catalyst = getCatalyst();
      if (!catalyst?.auth?.isUserAuthenticated) {
        window.location.replace(`${window.location.origin}/__catalyst/auth/login`);
        return;
      }

      try {
        const result = await catalyst.auth.isUserAuthenticated();
        const email = String(result?.content?.email_id || result?.content?.email || "")
          .trim()
          .toLowerCase();

        if (cancelled) return;
        setStatus(email === ALLOWED_EMAIL ? "allowed" : "denied");
      } catch {
        if (cancelled) return;
        window.location.replace(`${window.location.origin}/__catalyst/auth/login`);
      }
    }

    verifySession();
    return () => { cancelled = true; };
  }, []);

  function signOut() {
    const catalyst = getCatalyst();
    if (catalyst?.auth?.signOut) {
      catalyst.auth.signOut(`${window.location.origin}/__catalyst/auth/login`);
    } else {
      window.location.replace(`${window.location.origin}/__catalyst/auth/login`);
    }
  }

  if (status === "checking") {
    return (
      <main style={styles.screen}>
        <div style={styles.panel}>
          <div style={styles.spinner} aria-hidden="true" />
          <h1 style={styles.title}>NorthBridge Intelligence Hub</h1>
          <p style={styles.copy}>Verifying your sign-in…</p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main style={styles.screen}>
        <div style={styles.panel}>
          <div style={styles.lock} aria-hidden="true">⛔</div>
          <h1 style={styles.title}>Access restricted</h1>
          <p style={styles.copy}>This account is not authorized to access NorthBridge Intelligence Hub.</p>
          <p style={styles.email}>Allowed account: {ALLOWED_EMAIL}</p>
          <button type="button" onClick={signOut} style={styles.button}>Sign out</button>
        </div>
      </main>
    );
  }

  return children;
}

const styles = {
  screen: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f7fb", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#182230" },
  panel: { width: "100%", maxWidth: 440, boxSizing: "border-box", textAlign: "center", background: "#fff", padding: "40px 32px", border: "1px solid #e4e8ef", borderRadius: 18, boxShadow: "0 12px 40px rgba(20, 36, 64, 0.08)" },
  spinner: { width: 28, height: 28, margin: "0 auto 20px", border: "3px solid #e4e8ef", borderTopColor: "#2457d6", borderRadius: "50%" },
  lock: { fontSize: 30, marginBottom: 12 },
  title: { fontSize: 22, lineHeight: 1.3, margin: "0 0 12px", fontWeight: 700 },
  copy: { margin: "0 0 16px", color: "#657184", lineHeight: 1.6 },
  email: { fontSize: 13, color: "#657184", margin: "0 0 24px", overflowWrap: "anywhere" },
  button: { border: 0, borderRadius: 9, background: "#2457d6", color: "white", fontWeight: 600, padding: "11px 20px", cursor: "pointer" },
};
