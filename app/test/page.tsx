"use client";

import { useEffect, useState } from "react";

export default function TestPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-8">
      <div className="rounded-2xl bg-white/90 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          🧪 Test Page
        </h1>
        <p className="mb-6 text-lg text-gray-700">
          This is a test page on the <strong>test</strong> branch.
        </p>
        
        <div className="space-y-3 rounded-lg bg-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Branch:</span>
            <span className="rounded bg-blue-500 px-2 py-1 text-sm text-white">test</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Status:</span>
            <span className="rounded bg-green-500 px-2 py-1 text-sm text-white">
              {mounted ? "✅ Active" : "⏳ Loading..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Time:</span>
            <span className="text-sm text-gray-600">
              {mounted ? new Date().toLocaleString() : "—"}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
          <p className="text-sm text-gray-600">
            If you can see this page, the test branch deployment is working! 🎉
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href="/"
            className="rounded-lg bg-gray-800 px-4 py-2 text-white transition hover:bg-gray-900"
          >
            Go to Home
          </a>
          <a
            href="/profile"
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
          >
            Go to Profile
          </a>
        </div>
      </div>
    </main>
  );
}

