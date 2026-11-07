type AdvertText = { title: string; description: string };

function baseTitle(title: string): string {
  return title.replace(/^Copy of /, '').trim();
}

/** True when two adverts/drafts carry the same text (ignoring a "Copy of " prefix). */
export function isSameAdvertText(left: AdvertText, right: AdvertText): boolean {
  return baseTitle(left.title) === baseTitle(right.title) && left.description.trim() === right.description.trim();
}

/**
 * One entry per draft text, newest first. Each "Edit" of a live advert used to
 * leave another identical copy behind, so the same advert showed several times
 * in the drafts list.
 */
export function uniqueAdvertDrafts<T extends AdvertText & { id: string; updatedAt: string }>(drafts: T[]): T[] {
  const newestFirst = [...drafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const seenIds = new Set<string>();
  return newestFirst.filter((draft, index) => {
    if (seenIds.has(draft.id)) return false;
    seenIds.add(draft.id);
    return newestFirst.findIndex((other) => isSameAdvertText(other, draft)) === index;
  });
}
