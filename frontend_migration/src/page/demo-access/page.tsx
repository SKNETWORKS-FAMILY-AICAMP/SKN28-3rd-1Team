"use client";

import { FormEvent, useMemo, useState } from "react";

type DemoAccessPageProps = {
  nextPath?: string;
};

function sanitizeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function DemoAccessPage({ nextPath }: DemoAccessPageProps) {
  const safeNextPath = useMemo(() => sanitizeNextPath(nextPath), [nextPath]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, nextPath: safeNextPath }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        nextPath?: string;
        remainingAttempts?: number;
        retryAfterSeconds?: number;
      };

      if (response.ok) {
        window.location.assign(data.nextPath || safeNextPath);
        return;
      }

      if (response.status === 429) {
        const retryAfterSeconds = data.retryAfterSeconds ?? 60;
        setError(`${Math.ceil(retryAfterSeconds / 60)}분 뒤 다시 시도해 주세요.`);
        return;
      }

      if (typeof data.remainingAttempts === "number") {
        setError(`비밀번호를 확인해 주세요. 남은 시도 ${data.remainingAttempts}회`);
        return;
      }

      setError("비밀번호를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f2] px-6 text-[#181816]">
      <form
        className="w-full max-w-sm border border-[#d9d8cf] bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="mb-5">
          <h1 className="text-xl font-semibold">데모 접근</h1>
          <p className="mt-2 text-sm text-[#626159]">비밀번호를 입력해 주세요.</p>
        </div>
        <label className="block text-sm font-medium" htmlFor="demo-password">
          비밀번호
        </label>
        <input
          autoComplete="current-password"
          autoFocus
          className="mt-2 h-11 w-full border border-[#bdbcb2] px-3 outline-none focus:border-[#181816]"
          id="demo-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        {error ? <p className="mt-3 text-sm text-[#9f1d1d]">{error}</p> : null}
        <button
          className="mt-5 h-11 w-full bg-[#181816] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#8b8a82]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "확인 중" : "입장"}
        </button>
      </form>
    </main>
  );
}
