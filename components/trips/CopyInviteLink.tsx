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
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        className="flex-1 truncate rounded-lg border border-input bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground transition-[border-color] focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/35"
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Invite link"
      />
      <Button
        type="button"
        onClick={copy}
        variant={copied ? "secondary" : "default"}
        className="sm:w-24"
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
