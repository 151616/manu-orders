export const BOOKMARK_KINDS = ["TEMPLATE", "SITE"] as const;

export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

export const BOOKMARK_KIND_LABELS: Record<BookmarkKind, string> = {
  TEMPLATE: "Template",
  SITE: "Website",
};
