import { createFileRoute } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";
import { FeaturedCard, ProjectRow } from "@/components/project-card";
import { featuredProjects, moreProjects } from "@/data/projects";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const featured = featuredProjects();
  const more = moreProjects();

  return (
    <div className="home-enter flex min-h-dvh flex-col bg-cream text-ink">
      <a href="#things" className="skip-link">
        Skip to things
      </a>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 sm:px-8">
        <section
          aria-labelledby="hero-title"
          className="flex flex-col gap-5 pb-14 pt-8 sm:gap-6 sm:pb-20 sm:pt-12"
        >
          <a href="/" className="w-fit" aria-label="POLAH. Home">
            <Wordmark
              as="h1"
              id="hero-title"
              className="text-[clamp(3.4rem,16vw,7.5rem)]"
            />
          </a>
          <p className="home-kicker font-display text-[clamp(1.6rem,5vw,2.35rem)] font-semibold leading-tight tracking-tight">
            means “do” in Sarawak Malay.
          </p>
          <p className="home-lede max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            So here are small things I make while learning, experimenting, and
            occasionally solving problems.
          </p>
        </section>

        <section
          id="things"
          aria-labelledby="things-heading"
          className={more.length > 0 ? "pb-16 sm:pb-24" : "pb-10 sm:pb-16"}
        >
          <h2 id="things-heading" className="sr-only">
            Things
          </h2>
          <div className="things-grid">
            {featured.map((project) => (
              <FeaturedCard key={project.slug} project={project} />
            ))}
          </div>

          {more.length > 0 ? (
            <div className="mt-14 sm:mt-16">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                More things
              </h3>
              <ul className="mt-3 divide-y-[3px] divide-ink/15 border-y-[3px] border-ink/15">
                {more.map((project) => (
                  <li key={project.slug}>
                    <ProjectRow project={project} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="mt-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 pb-8 pt-4 sm:px-8">
          <p className="home-byline text-sm text-muted sm:text-base">
            Made by{" "}
            <a
              href="https://hafiy.my"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-ink/30 decoration-2 underline-offset-4 hover:decoration-ink"
            >
              Nazirul Hafiy
            </a>
            .
          </p>
        </div>
        <div className="ground" aria-hidden="true" />
      </footer>
    </div>
  );
}
