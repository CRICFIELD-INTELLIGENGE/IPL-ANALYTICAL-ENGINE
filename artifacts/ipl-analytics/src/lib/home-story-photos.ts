/** Keep article order while preventing the same photo from appearing twice in a Home rail. */
export function distinctStoryPhotos<T>(
  entries: T[],
  photoKey: (entry: T) => string,
  alreadyShown: T[] = [],
): T[] {
  const used = new Set(alreadyShown.map(photoKey));
  return entries.filter((entry) => {
    const key = photoKey(entry);
    if (used.has(key)) return false;
    used.add(key);
    return true;
  });
}
