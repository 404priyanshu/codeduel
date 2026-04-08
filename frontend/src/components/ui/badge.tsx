import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/12 text-primary",
        secondary: "border-border/70 bg-secondary/70 text-secondary-foreground",
        outline: "border-border bg-background/40 text-muted-foreground",
        success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
        violet: "border-violet-500/25 bg-violet-500/12 text-violet-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
