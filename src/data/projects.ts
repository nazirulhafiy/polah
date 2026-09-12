export type ProjectStatus = "LIVE" | "EXPERIMENT" | "WIP" | "ARCHIVED";

export type Project = {
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  category: string;
  year: number;
  featured: boolean;
  image?: string;
  imageAlt?: string;
  cta: string;
  available: boolean;
  /** Canonical URL. Defaults to `/${slug}/` when omitted. */
  href?: string;
};

/**
 * Add a Polah project by appending one object.
 * Set `available: false` until the path exists — unavailable entries never render.
 * Featured projects appear as large cards; the rest as a compact list.
 */
export const projects: Project[] = [
  {
    name: "Kracked Quest",
    slug: "kracked",
    description:
      "A tiny doodle platformer. Run, jump, stomp, collect.",
    status: "LIVE",
    category: "game",
    year: 2026,
    featured: true,
    image: "/projects/kracked.png",
    imageAlt:
      "KRACKED QUEST title art: Pipkin, a tabby cat in a red batik shirt, standing on green hills under a blue sky.",
    cta: "Play →",
    available: true,
    href: "https://polah.app/kracked/",
  },
  {
    name: "Sifir Sprint",
    slug: "sifir",
    description:
      "A 60-second times-tables race. Soalan, jawab, try lagi.",
    status: "LIVE",
    category: "game",
    year: 2026,
    featured: true,
    image: "/projects/sifir.png",
    imageAlt:
      "SIFIR SPRINT title art: a yellow title block over a navy sky and teal hills.",
    cta: "Play →",
    available: true,
    href: "https://polah.app/sifir/",
  },
  {
    name: "Belajar",
    slug: "belajar",
    description: "Learning experiments.",
    status: "WIP",
    category: "learning",
    year: 2026,
    featured: false,
    cta: "Open →",
    available: false,
  },
  {
    name: "Berlari",
    slug: "berlari",
    description: "Running tools and experiments.",
    status: "WIP",
    category: "tools",
    year: 2026,
    featured: false,
    cta: "Open →",
    available: false,
  },
  {
    name: "Game",
    slug: "game",
    description: "Games and strange little ideas.",
    status: "WIP",
    category: "game",
    year: 2026,
    featured: false,
    cta: "Play →",
    available: false,
  },
];

export function projectHref(project: Project): string {
  return project.href ?? `/${project.slug}/`;
}

export function featuredProjects(): Project[] {
  return projects.filter((project) => project.featured && project.available);
}

export function moreProjects(): Project[] {
  return projects.filter((project) => !project.featured && project.available);
}
