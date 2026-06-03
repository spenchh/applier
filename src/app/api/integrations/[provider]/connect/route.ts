import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { buildOAuthAuthorizationUrl, isOAuthProvider, markOAuthSetupMissing } from "@/lib/services/oauth";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const user = await currentUser();
  const url = new URL(request.url);
  if (!user) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent("/integrations")}`, url.origin));

  const { provider } = await params;
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL("/integrations?oauth=unknown", url.origin));

  const authorization = buildOAuthAuthorizationUrl(provider, user, url.origin, {
    canvasUrl: url.searchParams.get("canvasUrl") ?? undefined,
  });
  if (!authorization.configured) {
    await markOAuthSetupMissing(user.id, provider, authorization.missing);
  }
  return NextResponse.redirect(authorization.url);
}
