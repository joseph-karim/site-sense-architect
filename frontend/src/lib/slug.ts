export function makeSlug(parts: string[]) {
  const base = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

