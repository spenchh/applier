import { NextResponse } from "next/server";
import { saveMomentumIntegration, syncCanvasAssignments, syncGitHubActivity, syncGoogleCalendarEvents, syncMicrosoftCalendarEvents } from "@/lib/services/momentum";
import { exchangeOAuthCode, isOAuthProvider, providerConfig } from "@/lib/services/oauth";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const url = new URL(request.url);
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL("/integrations?oauth=unknown", url.origin));

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const config = providerConfig(provider, url.origin);

  if (error || !code || !state) {
    return NextResponse.redirect(new URL(`/integrations?oauth=failed&provider=${provider}`, url.origin));
  }

  try {
    const result = await exchangeOAuthCode(provider, code, url.origin, state);
    if (provider === "github") {
      await syncGitHubActivity(result.userId, { accessToken: result.accessToken });
    } else if (provider === "google_calendar") {
      await syncGoogleCalendarEvents(result.userId, { accessToken: result.accessToken });
    } else if (provider === "outlook") {
      await syncMicrosoftCalendarEvents(result.userId, { accessToken: result.accessToken });
    } else {
      await syncCanvasAssignments(result.userId, { canvasUrl: result.canvasUrl ?? "https://canvas.northwestern.edu", accessToken: result.accessToken });
    }
    return NextResponse.redirect(new URL(`/integrations?oauth=connected&provider=${provider}`, url.origin));
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "OAuth connection failed.";
    const stateUserId = readUserIdFromState(state);
    if (stateUserId) {
      await saveMomentumIntegration(stateUserId, {
        provider,
        label: config.label,
        config: { authMode: "oauth" },
        status: "error",
        lastError: message,
      });
    }
    return NextResponse.redirect(new URL(`/integrations?oauth=failed&provider=${provider}`, url.origin));
  }
}

function readUserIdFromState(state: string) {
  try {
    const [body] = state.split(".");
    if (!body) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}
