"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export default function ClearCookiesPage() {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Clear all cookies
    const clearAllCookies = () => {
      const cookies = document.cookie.split(";");

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    };

    // Sign out and clear cookies
    signOut({ redirect: false }).then(() => {
      clearAllCookies();
      setCleared(true);
    });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", textAlign: "center" }}>
      <h1>Clearing Cookies...</h1>
      {cleared ? (
        <div style={{ marginTop: "2rem" }}>
          <p style={{ color: "green", fontSize: "1.2rem" }}>✅ Cookies cleared successfully!</p>
          <p style={{ marginTop: "1rem" }}>
            <a
              href="/auth"
              style={{
                padding: "0.5rem 1rem",
                background: "#0070f3",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                display: "inline-block",
              }}
            >
              Go to Sign In
            </a>
          </p>
        </div>
      ) : (
        <p>Please wait...</p>
      )}
    </div>
  );
}
