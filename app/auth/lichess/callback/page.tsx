"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { completeLichessOAuth } from "@/lib/lichess/oauth";

export default function LichessCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Loading…" />}>
      <LichessCallbackInner />
    </Suspense>
  );
}

function LichessCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Completing Lichess sign-in…");

  useEffect(() => {
    const code = params.get("code");
    const err = params.get("error");
    if (err) {
      setMessage(`Lichess returned an error: ${err}`);
      return;
    }
    if (!code) {
      setMessage("Missing authorization code.");
      return;
    }
    completeLichessOAuth(code)
      .then(() => {
        setMessage("Signed in. Redirecting…");
        setTimeout(() => router.replace("/"), 500);
      })
      .catch((e) => setMessage((e as Error).message));
  }, [params, router]);

  return <CallbackShell message={message} />;
}

function CallbackShell({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
