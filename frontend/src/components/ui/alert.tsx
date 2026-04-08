import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-card/80 text-card-foreground",
        destructive:
          "border-red-900/70 bg-red-950/45 text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("text-sm leading-relaxed", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
