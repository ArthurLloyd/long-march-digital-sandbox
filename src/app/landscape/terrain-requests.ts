/** Last request wins, including cancellation, failures and disposal. */
export function createTerrainRequests<T>(
  load: (id: string) => Promise<T>,
  commit: (value: T, id: string) => void,
) {
  let revision = 0,
    disposed = false;
  let pending: { id: string; revision: number } | null = null;
  const cache = new Map<string, Promise<T>>();
  return {
    async request(id: string) {
      if (disposed) return null;
      const ticket = ++revision;
      pending = { id, revision: ticket };
      let loading = cache.get(id);
      if (!loading) {
        loading = load(id);
        cache.set(id, loading);
        if (cache.size > 3) cache.delete(cache.keys().next().value!);
      }
      try {
        const value = await loading;
        if (disposed || ticket !== revision) return null;
        commit(value, id);
        return value;
      } catch {
        if (cache.get(id) === loading) cache.delete(id);
        return null;
      } finally {
        if (pending?.revision === ticket) pending = null;
      }
    },
    cancel() {
      revision++;
      pending = null;
    },
    dispose() {
      disposed = true;
      revision++;
      pending = null;
      cache.clear();
    },
    get size() {
      return cache.size;
    },
    get pendingId() {
      return pending?.id ?? null;
    },
  };
}
