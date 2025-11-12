"use client";

import * as React from "react";

import { PasswordInput } from "@/components/ui/password-input-2";

export default function PasswordInputDemo() {
  const [password, setPassword] = React.useState("");

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-2">
        <label htmlFor="demo-password" className="block text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="demo-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>
    </div>
  );
}

