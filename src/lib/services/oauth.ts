import crypto from "node:crypto";
import type { AuthUser } from "@/lib/auth";
import { saveMomentumIntegration } from "@/lib/services/momentum";

export type OAuthProvider = "github" | "google_calendar" | "outlook" | "canvas";

type ProviderConfig = {
  provider: OAuthProvider;
  label: string;
  clientId?: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
  canvasUrl?: string;
};

type OAuthState = {
  provider: OAuthProvider;
  userId: string;
  canvasUrl?: string;
  exp: number;
};

export function buildOAuthAuthorizationUrl(provider: OAuthProvider, user: AuthUser, origin: string, input?: { canvasUrl?: string }) {
  const config = providerConfig(provider, origin, input);
  const redirectUri = oauthRedirectUri(origin, provider);
  if (!config.clientId || !config.clientSecret) {
    return {
      configured: false,
      label: config.label,
      url: new URL(`/integrations?oauth=setup&provider=${provider}`, origin),
      missing: missingEnvFor(provider),
    };
  }

  const state = signOAuthState({
    provider,
    userId: user.id,
    canvasUrl: config.canvasUrl,
    exp: Date.now() + 10 * 60 * 1000,
  });
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (config.scopes.length) url.searchParams.set("scope", config.scopes.join(" "));
  for (const [key, value] of Object.entries(config.extraAuthParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return { configured: true, label: config.label, url, missing: [] };
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string, origin: string, stateToken: string) {
  const state = verifyOAuthState(stateToken);
  if (!state || state.provider !== provider || state.exp < Date.now()) throw new Error("OAuth connection expired. Try connecting again.");
  const config = providerConfig(provider, origin, { canvasUrl: state.canvasUrl });
  if (!config.clientId || !config.clientSecret) throw new Error(`${config.label} OAuth is not configured.`);

  const redirectUri = oauthRedirectUri(origin, provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error?: string; error_description?: string } | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || `${config.label} did not return an access token.`);
  }

  return {
    accessToken: payload.access_token,
    userId: state.userId,
    canvasUrl: state.canvasUrl,
    label: config.label,
  };
}

export async function markOAuthSetupMissing(userId: string, provider: OAuthProvider, missing: string[]) {
  const config = providerConfig(provider, "https://example.com");
  await saveMomentumIntegration(userId, {
    provider,
    label: config.label,
    config: { authMode: "oauth", missing: missing.join(", ") },
    status: "needs_setup",
    lastError: `Ask the app owner to configure ${missing.join(", ")}.`,
  });
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "github" || value === "google_calendar" || value === "outlook" || value === "canvas";
}

export function providerConfig(provider: OAuthProvider, origin: string, input?: { canvasUrl?: string }): ProviderConfig {
  if (provider === "github") {
    return {
      provider,
      label: "GitHub",
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: (process.env.GITHUB_OAUTH_SCOPE ?? "read:user public_repo").split(/\s+/).filter(Boolean),
    };
  }

  if (provider === "google_calendar") {
    return {
      provider,
      label: "Google Calendar",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      extraAuthParams: { access_type: "offline", prompt: "consent" },
    };
  }

  if (provider === "outlook") {
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    return {
      provider,
      label: "Outlook / Microsoft 365",
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      scopes: ["offline_access", "User.Read", "Calendars.Read"],
    };
  }

  const canvasUrl = normalizeCanvasUrl(input?.canvasUrl || process.env.CANVAS_BASE_URL || "https://canvas.northwestern.edu");
  return {
    provider,
    label: "Canvas",
    clientId: process.env.CANVAS_CLIENT_ID,
    clientSecret: process.env.CANVAS_CLIENT_SECRET,
    authUrl: `${canvasUrl}/login/oauth2/auth`,
    tokenUrl: `${canvasUrl}/login/oauth2/token`,
    scopes: [],
    canvasUrl,
  };
}

function oauthRedirectUri(origin: string, provider: OAuthProvider) {
  return `${origin}/api/integrations/${provider}/callback`;
}

function missingEnvFor(provider: OAuthProvider) {
  if (provider === "github") return ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"].filter((key) => !process.env[key]);
  if (provider === "google_calendar") return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].filter((key) => !process.env[key]);
  if (provider === "outlook") return ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"].filter((key) => !process.env[key]);
  return ["CANVAS_CLIENT_ID", "CANVAS_CLIENT_SECRET"].filter((key) => !process.env[key]);
}

function signOAuthState(state: OAuthState) {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function verifyOAuthState(token: string): OAuthState | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;
  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
    if (!isOAuthProvider(state.provider) || !state.userId || typeof state.exp !== "number") return null;
    return state;
  } catch {
    return null;
  }
}

function sign(body: string) {
  return crypto.createHmac("sha256", oauthSecret()).update(body).digest("base64url");
}

function oauthSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "momentum-local-session-secret-change-me";
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  if (firstBuffer.byteLength !== secondBuffer.byteLength) return false;
  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

function normalizeCanvasUrl(canvasUrl: string) {
  const trimmed = canvasUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
