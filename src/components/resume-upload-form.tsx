"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { inputClass, labelClass } from "./ui";

const maxBytes = 5 * 1024 * 1024;

export function ResumeUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    if (!file) {
      setStatus("error");
      setMessage("Choose a PDF or DOCX resume first.");
      return;
    }
    if (file.size > maxBytes) {
      setStatus("error");
      setMessage("Resume uploads must be 5 MB or smaller.");
      return;
    }

    setStatus("uploading");
    setMessage("Parsing resume...");
    formData.set("file", file);
    const response = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; name?: string; extractedCharacters?: number };
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Unable to upload that resume.");
      return;
    }
    setStatus("success");
    setMessage(`Uploaded ${payload.name ?? file.name}. Extracted ${payload.extractedCharacters ?? 0} characters.`);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4">
      <label className={labelClass}>
        Resume name
        <input name="name" className={inputClass} defaultValue="Uploaded Resume" required />
      </label>
      <label className={labelClass}>
        Base template
        <select name="baseType" className={inputClass} defaultValue="general_internship">
          <option value="software_engineering">Software engineering</option>
          <option value="data_science">Data science</option>
          <option value="product_management">Product management</option>
          <option value="design_ux">Design / UX</option>
          <option value="finance">Finance</option>
          <option value="consulting">Consulting</option>
          <option value="research">Research</option>
          <option value="marketing">Marketing</option>
          <option value="operations">Operations</option>
          <option value="communications">Communications</option>
          <option value="general_internship">General internship</option>
        </select>
      </label>
      <button
        type="button"
        className="grid min-h-36 place-items-center rounded-md border border-dashed border-[var(--line)] bg-stone-50 p-5 text-center hover:bg-stone-100"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files.item(0);
          if (dropped) setFile(dropped);
        }}
      >
        <span className="grid place-items-center gap-2 text-sm text-stone-700">
          <UploadCloud className="h-6 w-6 text-emerald-700" aria-hidden />
          <span className="font-medium">{file ? file.name : "Choose or drop a PDF/DOCX resume"}</span>
          <span className="text-xs text-[var(--muted)]">5 MB max. Text is extracted and stored; original bytes are not required for production persistence.</span>
        </span>
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
        onChange={(event) => setFile(event.currentTarget.files?.item(0) ?? null)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input name="isMaster" type="checkbox" defaultChecked />
        Set as master resume
      </label>
      <button
        type="submit"
        disabled={status === "uploading"}
        className="inline-flex items-center justify-center rounded-md bg-[#17473a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11352c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "uploading" ? "Uploading..." : "Upload and parse"}
      </button>
      {message ? <p className={status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{message}</p> : null}
    </form>
  );
}
