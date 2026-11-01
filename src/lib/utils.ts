import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme's type-scale tokens must be registered, or tailwind-merge reads them as text
// colours and drops them whenever a colour class follows. The density tokens likewise, or
// a later `px-2` cannot replace `px-cell-x`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: { "font-size": [{ text: ["micro", "caption", "ui"] }] },
    theme: { spacing: ["row", "cell-x", "cell-y", "section"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
