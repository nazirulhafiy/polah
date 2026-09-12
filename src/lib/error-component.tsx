import type { ErrorComponentProps } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";

const FALLBACK_MESSAGE = "Something broke. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-cream px-6 text-center text-ink">
      <Wordmark className="text-3xl" />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-pretty text-base text-muted break-words">
        {errorMessage(error)}
      </p>
      <a href="/" className="ink lift rounded-[14px] bg-butter px-5 py-3 font-display text-base font-semibold">
        Back
      </a>
    </main>
  );
}
