"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  type TestResult = {
    user?: unknown;
    error?: string;
    [key: string]: unknown;
  };
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const testBackendAuth = async () => {
    const res = await fetch("/api/auth/test");
    const data = await res.json();
    setTestResult(data);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Authentication Test Page</h1>

      <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}>
        <h2>Client Session (useSession)</h2>
        <p><strong>Status:</strong> {status}</p>
        <pre>{JSON.stringify(session, null, 2)}</pre>
      </div>

      <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}>
        <h2>Backend Auth Test</h2>
        <button onClick={testBackendAuth} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Test Backend Auth
        </button>
        {testResult && (
          <pre style={{ marginTop: "1rem" }}>{JSON.stringify(testResult, null, 2)}</pre>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Cookies</h2>
        <pre>{document.cookie || "No cookies found"}</pre>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <a href="/auth" style={{ padding: "0.5rem 1rem", background: "#0070f3", color: "white", textDecoration: "none", borderRadius: "4px" }}>
          Go to Auth Page
        </a>
      </div>
    </div>
  );
}
