export const MISSING = Symbol('missing');

/** RFC 6901 JSON Pointer lookup. "/" and "" both mean the whole document. */
export function resolvePointer(doc: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '/') return doc;
  if (!pointer.startsWith('/')) return MISSING;
  let cur: unknown = doc;
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(key) || Number(key) >= cur.length) return MISSING;
      cur = cur[Number(key)];
    } else if (cur !== null && typeof cur === 'object' && Object.hasOwn(cur, key)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return MISSING;
    }
  }
  return cur;
}
