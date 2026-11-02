/** Last request wins, including cancellation, failures and disposal. */
export function createTerrainRequests<T>(
  load: (id: string) => Promise<T>,
  commit: (value: T, id: string) => void,
) {
  let revision = 0,
    disposed = false;
  const cache = new Map<string, Promise<T>>();
  return {
    async request(id: string) {
      if (disposed) return null;
      const ticket = ++revision;
      let pending = cache.get(id);
      if (!pending) {
        pending = load(id);
        cache.set(id, pending);
        if (cache.size > 3) cache.delete(cache.keys().next().value!);
      }
      try {
        const value = await pending;
        if (disposed || ticket !== revision) return null;
        commit(value, id);
        return value;
      } catch {
        if (cache.get(id) === pending) cache.delete(id);
        return null;
      }
    },
    cancel() {
      revision++;
    },
    dispose() {
      disposed = true;
      revision++;
      cache.clear();
    },
    get size() {
      return cache.size;
    },
  };
}
