const CLIENT_ID =
  process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID ?? "repertoire-scanner.local";

const VERIFIER_KEY = "lichess_code_verifier";
const TOKEN_KEY = "lichess_access_token";
const AUTH_EVENT = "lichess-auth-changed";

const SCOPES = ["study:write", "preference:read"];

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function challengeFor(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function redirectUri(): string {
  return `${window.location.origin}/auth/lichess/callback`;
}

export async function startLichessOAuth(): Promise<void> {
  const verifier = randomVerifier();
  const challenge = await challengeFor(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.assign(`https://lichess.org/oauth?${params.toString()}`);
}

export async function completeLichessOAuth(code: string): Promise<string> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier");

  const res = await fetch("https://lichess.org/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) {
    throw new Error(`Lichess token exchange failed (${res.status})`);
  }

  const payload = (await res.json()) as { access_token: string };
  sessionStorage.setItem(TOKEN_KEY, payload.access_token);
  sessionStorage.removeItem(VERIFIER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  return payload.access_token;
}

export function getLichessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearLichessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export const LICHESS_AUTH_EVENT = AUTH_EVENT;
