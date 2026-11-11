// Who built the site, and where to reach them. The footer, About and Contact
// pages all read from here, so this is the only file to edit.
//
// A link left as "" is simply not shown — no placeholder or dead link reaches
// the page.

export const SITE = {
  /** Short name used in "Built by …". */
  name: "Srihari",
  /** Full name for the About and Contact pages. */
  fullName: "Srihari Beesetti",
  github: "https://github.com/Srihari1806",
  /** Public repository for this project. The repo is private right now, so it is not linked. */
  repo: "",
  /** e.g. "https://www.linkedin.com/in/your-handle". */
  linkedin: "",
  /** Shown on the Contact page as a mailto link when set. */
  email: "",
  projectName: "CricField",
} as const;

export const hasLink = (v: string) => v.trim().length > 0;
