import { type Project, projectHref } from "@/data/projects";

export function FeaturedCard({ project }: { project: Project }) {
  const href = projectHref(project);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group/card ink lift flex flex-col overflow-hidden rounded-[18px] bg-paper text-ink"
    >
      {project.image ? (
        <div className="relative aspect-[1200/540] overflow-hidden border-b-[3px] border-ink bg-navy">
          <img
            src={project.image}
            alt={project.imageAlt ?? ""}
            width={1200}
            height={630}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <h3 className="font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {project.name}
        </h3>
        <p className="max-w-prose flex-1 text-pretty text-[0.95rem] leading-relaxed text-muted sm:text-base">
          {project.description}
        </p>
        <span className="ink-sm mt-1 inline-flex min-h-11 w-fit items-center rounded-[14px] bg-butter pl-4 pr-3.5 font-display text-base font-semibold">
          {project.cta.replace(" →", "")}
          <span className="cta-arrow pl-1" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </a>
  );
}

export function ProjectRow({ project }: { project: Project }) {
  const href = projectHref(project);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group/row -mx-2 flex min-h-14 items-baseline justify-between gap-4 rounded-[14px] px-2 py-3 text-ink transition-colors hover:bg-paper"
    >
      <span className="min-w-0">
        <span className="font-display text-lg font-semibold">{project.name}</span>
        <span className="mt-0.5 block text-pretty text-sm text-muted">{project.description}</span>
      </span>
      <span className="cta-arrow shrink-0 font-display text-lg font-semibold" aria-hidden="true">
        →
      </span>
    </a>
  );
}
