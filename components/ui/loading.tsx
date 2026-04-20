import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  text?: string;
  className?: string;
  fullPage?: boolean;
}

export function Loading({ text = "Loading...", className, fullPage = false }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        fullPage ? "h-[50vh]" : "py-8",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}
