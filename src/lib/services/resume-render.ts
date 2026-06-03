import type { ResumeStructure } from "../llm/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="rsec"><h2>${esc(title)}</h2>${body}</section>`;
}

/**
 * Render a structured resume to clean, ATS-friendly HTML.
 *
 * Deliberately simple: standard headings, no tables, no columns, no images,
 * consistent date placement, readable bullets, one-page-oriented spacing. This
 * HTML is also the PDF source (print-to-PDF in the browser).
 */
export function renderResumeHtml(resume: ResumeStructure): string {
  const h = resume.header;
  const contactLine = [h.email, h.phone, h.location, ...h.links].filter(Boolean).map(esc).join("  •  ");

  const education = resume.education
    .map((e) => {
      const head = [e.degree, e.field].filter(Boolean).map(esc).join(", ");
      const right = [e.graduation].filter(Boolean).map(esc).join("");
      const gpa = e.gpa ? `<div class="muted">GPA: ${esc(e.gpa)}</div>` : "";
      const details = e.details.length
        ? `<ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`
        : "";
      return `<div class="entry"><div class="entry-head"><strong>${esc(e.school)}</strong><span>${right}</span></div><div>${head}</div>${gpa}${details}</div>`;
    })
    .join("");

  const experience = resume.experience
    .map((x) => {
      const dates = [x.startDate, x.endDate].filter(Boolean).map(esc).join(" – ");
      const sub = [x.organization, x.location].filter(Boolean).map(esc).join(" • ");
      const bullets = x.bullets.length
        ? `<ul>${x.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
        : "";
      return `<div class="entry"><div class="entry-head"><strong>${esc(x.title)}</strong><span>${dates}</span></div><div class="muted">${sub}</div>${bullets}</div>`;
    })
    .join("");

  const projects = resume.projects
    .map((p) => {
      const tech = p.technologies.length ? ` <span class="muted">(${p.technologies.map(esc).join(", ")})</span>` : "";
      const bullets = p.bullets.length
        ? `<ul>${p.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
        : "";
      const desc = p.description ? `<div>${esc(p.description)}</div>` : "";
      return `<div class="entry"><div><strong>${esc(p.name)}</strong>${tech}</div>${desc}${bullets}</div>`;
    })
    .join("");

  const skills = resume.skills.length ? `<p>${resume.skills.map(esc).join("  •  ")}</p>` : "";
  const awards = resume.awards.length
    ? `<ul>${resume.awards.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    :root{--ink:#111;--muted:#555}
    *{box-sizing:border-box}
    body{font-family:Georgia,'Times New Roman',serif;color:var(--ink);max-width:8.5in;margin:0 auto;padding:0.5in;line-height:1.35;font-size:11pt}
    header{text-align:center;margin-bottom:10px}
    header h1{margin:0;font-size:20pt}
    .contact{font-size:9.5pt;color:var(--muted)}
    h2{font-size:11.5pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;padding-bottom:2px;margin:14px 0 6px}
    .summary{font-size:10.5pt}
    .entry{margin-bottom:8px}
    .entry-head{display:flex;justify-content:space-between;gap:12px}
    .muted{color:var(--muted);font-size:10pt}
    ul{margin:4px 0 4px 18px;padding:0}
    li{margin:2px 0}
    p{margin:4px 0}
    @media print{body{padding:0.4in}}
  </style></head><body>
    <header>
      <h1>${esc(h.name || "Your Name")}</h1>
      <div class="contact">${contactLine}</div>
    </header>
    ${resume.summary ? `<section class="rsec"><h2>Summary</h2><p class="summary">${esc(resume.summary)}</p></section>` : ""}
    ${section("Education", education)}
    ${section("Experience", experience)}
    ${section("Projects", projects)}
    ${section("Skills", skills)}
    ${section("Awards & Leadership", awards)}
  </body></html>`;
}

/** Plain-text rendering (for copy/paste and email bodies). */
export function renderResumeText(resume: ResumeStructure): string {
  const lines: string[] = [];
  const h = resume.header;
  lines.push(h.name || "Your Name");
  lines.push([h.email, h.phone, h.location, ...h.links].filter(Boolean).join(" | "));
  if (resume.summary) {
    lines.push("", "SUMMARY", resume.summary);
  }
  if (resume.education.length) {
    lines.push("", "EDUCATION");
    for (const e of resume.education) {
      lines.push(`${e.school} — ${[e.degree, e.field].filter(Boolean).join(", ")} ${e.graduation}`.trim());
      if (e.gpa) lines.push(`  GPA: ${e.gpa}`);
      e.details.forEach((d) => lines.push(`  • ${d}`));
    }
  }
  if (resume.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const x of resume.experience) {
      lines.push(`${x.title} — ${[x.organization, x.location].filter(Boolean).join(", ")} (${[x.startDate, x.endDate].filter(Boolean).join(" – ")})`);
      x.bullets.forEach((b) => lines.push(`  • ${b}`));
    }
  }
  if (resume.projects.length) {
    lines.push("", "PROJECTS");
    for (const p of resume.projects) {
      lines.push(`${p.name}${p.technologies.length ? ` (${p.technologies.join(", ")})` : ""}`);
      if (p.description) lines.push(`  ${p.description}`);
      p.bullets.forEach((b) => lines.push(`  • ${b}`));
    }
  }
  if (resume.skills.length) {
    lines.push("", "SKILLS", resume.skills.join(", "));
  }
  if (resume.awards.length) {
    lines.push("", "AWARDS & LEADERSHIP");
    resume.awards.forEach((a) => lines.push(`  • ${a}`));
  }
  return lines.join("\n");
}
