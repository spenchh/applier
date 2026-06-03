import { NextResponse } from "next/server";

const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "linkedin.com", "indeed.com", "handshake.com", "joinhandshake.com"];

export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  const parsed = parseSafeUrl(url);
  if (!parsed) return NextResponse.json({ error: "Use a public http or https URL." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "InternPilot profile link audit" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      return NextResponse.json({ error: "Unable to read public HTML metadata." }, { status: 422 });
    }
    const html = (await response.text()).slice(0, 180000);
    return NextResponse.json(buildAudit(parsed.toString(), html));
  } catch {
    return NextResponse.json({ error: "Unable to scan this page." }, { status: 422 });
  } finally {
    clearTimeout(timeout);
  }
}

function parseSafeUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return null;
    if (/^(10|127|172\.(1[6-9]|2\d|3[01])|192\.168|169\.254)\./.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function buildAudit(url: string, html: string) {
  const title = matchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    matchText(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    matchText(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const text = stripTags(html).toLowerCase();
  const signals = [
    /project|work sample|case study|portfolio/.test(text) ? "Projects or work samples" : "",
    /resume|cv/.test(text) ? "Resume or CV link" : "",
    /contact|email|mailto:/.test(text) ? "Contact path" : "",
    /github\.com/.test(html) ? "GitHub link" : "",
    /linkedin\.com\/in\//.test(html) ? "LinkedIn link" : "",
    /calendly|calendar|schedule/.test(text) ? "Scheduling link" : "",
  ].filter(Boolean);
  const gaps = [
    signals.includes("Projects or work samples") ? "" : "Add projects, case studies, or work samples.",
    signals.includes("Resume or CV link") ? "" : "Add a resume or CV download link.",
    signals.includes("Contact path") ? "" : "Add a contact form or professional email.",
    signals.includes("Scheduling link") ? "" : "Consider a scheduling link for recruiter calls.",
  ].filter(Boolean);
  return { url, title, description, signals, gaps };
}

function matchText(value: string, pattern: RegExp) {
  return decodeEntities(value.match(pattern)?.[1]?.replace(/\s+/g, " ").trim() ?? "");
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeEntities(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&#39;", "'");
}
