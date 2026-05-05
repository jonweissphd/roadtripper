"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers (eg. Safari without HTTPS) may block clipboard.
      // Fall through silently — the user can still long-press to copy.
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
      <Button type="button" onClick={copy} variant="outline">
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
