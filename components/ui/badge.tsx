import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-slate-600 bg-slate-800 text-slate-200",
        success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        warning: "border-amber-400/40 bg-amber-500/15 text-amber-300",
        danger: "border-rose-500/40 bg-rose-500/20 text-rose-300",
        info: "border-sky-500/40 bg-sky-500/20 text-sky-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
