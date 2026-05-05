import * as React from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="eyebrow"
      className={cn(
        "text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
