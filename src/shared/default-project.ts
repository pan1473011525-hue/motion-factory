import type {MotionProject} from "../../packages/project-model/src";
import {createMotionProject} from "../../packages/project-model/src";
import {statCounterManifest} from "../templates/stat-counter/manifest";

export const defaultStatCounterProps = statCounterManifest.defaultProps;

export const createDefaultProject = (id: string, now: string): MotionProject =>
  createMotionProject({
    id,
    now,
    templateId: "stat-counter",
    templateVersion: statCounterManifest.version,
    props: defaultStatCounterProps,
  });
