import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppErrorComponent } from "@/lib/error-component";
import { Wordmark } from "@/components/wordmark";
import appCss from "../styles.css?url";

const APP_NAME = "POLAH.";
const APP_DESCRIPTION =
  "POLAH. means “do” in Sarawak Malay. So here are small things I make while learning, experimenting, and occasionally solving problems.";

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-cream px-6 text-center text-ink">
      <Wordmark className="text-3xl" />
      <h1 className="text-xl font-semibold">Nothing here.</h1>
      <a
        href="/"
        className="ink lift rounded-[14px] bg-butter px-5 py-3 font-display text-base font-semibold"
      >
        Back
      </a>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "theme-color", content: "#fff4d8" },
      { name: "color-scheme", content: "light" },
    ],
    links: [
      { rel: "canonical", href: "https://polah.app/" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesk:opsz,wght@12..96,400;500;600;700;800&family=Fredoka:wght@500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
  errorComponent: AppErrorComponent,
  notFoundComponent: NotFound,
});

function RootDocument() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-cream text-ink">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
