"use client";

import { Check, Download, Link2, Share2 } from "lucide-react";
import { useState } from "react";

export function ProfileActions({ path, fileName }: { path: string; fileName: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Shares the PDF itself where the device supports it (e.g. to LINE on a phone), otherwise the link.
  async function share() {
    const url = new URL(path, window.location.origin).href;
    try {
      const blob = await (await fetch(path)).blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "OrangePack Company Profile" });
      } else if (navigator.share) {
        await navigator.share({ url, title: "OrangePack Company Profile" });
      } else {
        await copyLink();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") await copyLink();
    }
  }

  return (
    <div className="page__actions">
      <a href={path} download={fileName} className="btn btn--sm btn--primary">
        <Download size={16} aria-hidden />
        ดาวน์โหลด PDF
      </a>
      <button type="button" className="btn btn--sm btn--quiet" onClick={share}>
        <Share2 size={16} aria-hidden />
        แชร์
      </button>
      <button type="button" className="btn btn--sm btn--ghost" onClick={copyLink} aria-live="polite">
        {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </button>
    </div>
  );
}
