import type { ElementType } from "react";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  as?: ElementType;
  id?: string;
};

export function Wordmark({ className, as: Tag = "span", id }: WordmarkProps) {
  return (
    <Tag id={id} className={cn("wordmark", className)}>
      POLAH
      <span className="sr-only">.</span>
      <span className="wordmark-dot" aria-hidden="true" />
    </Tag>
  );
}
