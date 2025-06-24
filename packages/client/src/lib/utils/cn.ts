import { clsx } from "clsx";
import { flow } from "effect/Function";
import { twMerge } from "tailwind-merge";

export const cn = flow(clsx, twMerge);
