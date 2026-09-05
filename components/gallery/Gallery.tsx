"use client";

import { useMemo, useState } from "react";
import type { Project, ProjectCategory } from "@/lib/content";
import { ProjectCard } from "./ProjectCard";
import styles from "./Gallery.module.css";

type FilterValue = ProjectCategory | "all";

const CATEGORY_LABELS: Record<FilterValue, string> = {
  all: "All Projects",
  landscape: "Landscape Lighting",
  architectural: "Architectural Lighting",
  "palms-trees": "Palms & Trees",
  pathways: "Pathways",
  "pools-patios": "Pools & Patios",
  permanent: "Permanent Lighting",
  "before-after": "Before & After",
};

const FILTER_ORDER: FilterValue[] = [
  "all",
  "landscape",
  "architectural",
  "palms-trees",
  "pathways",
  "pools-patios",
  "permanent",
  "before-after",
];

export function Gallery({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const available = useMemo(() => {
    const present = new Set(projects.map((project) => project.category));
    return FILTER_ORDER.filter((value) => value === "all" || present.has(value));
  }, [projects]);

  const filtered = filter === "all" ? projects : projects.filter((project) => project.category === filter);

  return (
    <div>
      <div className={styles.filters}>
        {available.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.filterButton} ${filter === value ? styles.filterButtonActive : ""}`}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No projects in this category yet.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
