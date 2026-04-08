import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-input/70 px-3 py-2 text-sm text-foreground shadow-sm transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:bg-background/80",
        className
      )}
      {...props}
    />
  );
}

export { Input };
