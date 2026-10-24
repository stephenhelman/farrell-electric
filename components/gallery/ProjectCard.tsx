import Image from "next/image";
import type { Project } from "@/lib/content";
import { ImageInfo } from "./ImageInfo";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import styles from "./ProjectCard.module.css";

const REAL_IMAGE_NOTE = "Real image from a real customer.";

/**
 * isRealProject gates all claim language and representative-image treatment.
 * A placeholder never renders a title/claim implying a completed Farrell job —
 * its provenance note lives behind the (i) control, and only the neutral,
 * non-claim caption from content is used.
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
      </div>

      <div className={styles.meta}>
        {project.isRealProject && <h3 className={styles.title}>{project.title}</h3>}
        <ImageInfo note={project.isRealProject ? REAL_IMAGE_NOTE : project.caption} />
      </div>
    </div>
  );
}
