import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  try {
    await signIn({ email, password, remember });
  } catch {
    return NextResponse.json({ error: "That email and password do not match an account. Please try again." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
