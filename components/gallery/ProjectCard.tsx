import Image from "next/image";
import type { Project } from "@/lib/content";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import styles from "./ProjectCard.module.css";

/**
 * isRealProject gates all claim language and representative-image treatment.
 * A placeholder never renders a title/claim implying a completed Farrell job —
 * only the neutral, non-claim caption from content.
 */
export function ProjectCard({ project }: { project: Project }) {
  const hasBeforeAfter = Boolean(project.beforeImage && project.afterImage);

  return (
    <div className={styles.card}>
      <div className={styles.mediaWrap}>
        {hasBeforeAfter ? (
          <BeforeAfterSlider beforeImage={project.beforeImage!} afterImage={project.afterImage!} />
        ) : (
          <div className={styles.frame}>
            <Image src={project.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        )}
        {!project.isRealProject && (
          <span className={styles.badge}>Representative imagery — actual project photos coming soon</span>
        )}
      </div>

      {project.isRealProject ? (
        <h3 className={styles.title}>{project.title}</h3>
      ) : (
        <p className={styles.caption}>{project.caption}</p>
      )}
    </div>
  );
}
