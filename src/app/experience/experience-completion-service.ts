import { z } from 'zod';
import {
  completionRecordSchema,
  type CompletionRecord,
} from '../../shared/contracts';

export const COMPLETION_STORAGE_KEY = 'long-march.experience-completion.v1';
const envelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generation: z.string().regex(/^(0|\d{16,}-[A-Za-z0-9-]+)$/),
  records: z.array(z.unknown()).max(6),
});
export interface CompletionSnapshot {
  records: readonly CompletionRecord[];
  generation: string;
  persistent: boolean;
  notice: string | null;
}
type Backend = Pick<Storage, 'getItem' | 'setItem'>;
interface Options {
  storage: () => Backend | null;
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  now?: () => number;
}
function mergeRecords(...groups: readonly (readonly CompletionRecord[])[]) {
  const records = new Map<string, CompletionRecord>();
  for (const record of groups.flat()) {
    const previous = records.get(record.experienceId);
    if (
      !previous ||
      record.completionPolicyVersion > previous.completionPolicyVersion ||
      (record.completionPolicyVersion === previous.completionPolicyVersion &&
        Date.parse(record.completedAt) > Date.parse(previous.completedAt))
    )
      records.set(record.experienceId, record);
  }
  return [...records.values()].sort((a, b) =>
    a.experienceId.localeCompare(b.experienceId),
  );
}
export class CompletionStore {
  private snapshot: CompletionSnapshot;
  private listeners = new Set<() => void>();
  constructor(private options: Options) {
    this.snapshot = this.read();
  }
  private read(): CompletionSnapshot {
    try {
      const backend = this.options.storage();
      if (!backend) throw new Error('storage unavailable');
      const value = backend.getItem(COMPLETION_STORAGE_KEY);
      if (value === null)
        return { records: [], generation: '0', persistent: true, notice: null };
      const envelope = envelopeSchema.safeParse(JSON.parse(value));
      if (!envelope.success)
        return {
          records: [],
          generation: '0',
          persistent: true,
          notice: '体验记录格式已损坏，已安全忽略。',
        };
      const parsed = envelope.data.records.map((record) =>
        completionRecordSchema.safeParse(record),
      );
      return {
        generation: envelope.data.generation,
        records: mergeRecords(
          parsed.flatMap((result) => (result.success ? [result.data] : [])),
        ),
        persistent: true,
        notice: parsed.some((result) => !result.success)
          ? '部分体验记录已损坏，已安全忽略。'
          : null,
      };
    } catch {
      return {
        records: [],
        generation: '0',
        persistent: false,
        notice: '浏览器无法保存长期进度，本次会话仍可完成体验。',
      };
    }
  }
  private merged(disk: CompletionSnapshot): CompletionSnapshot {
    if (!disk.persistent)
      return { ...this.snapshot, persistent: false, notice: disk.notice };
    if (disk.generation > this.snapshot.generation) return disk;
    if (disk.generation < this.snapshot.generation)
      return { ...this.snapshot, persistent: disk.persistent };
    return {
      ...disk,
      records: mergeRecords(this.snapshot.records, disk.records),
    };
  }
  private publish(next: CompletionSnapshot) {
    if (JSON.stringify(next) === JSON.stringify(this.snapshot)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
  private persist(next: CompletionSnapshot) {
    try {
      const backend = this.options.storage();
      if (!backend) throw new Error('storage unavailable');
      backend.setItem(
        COMPLETION_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: 1,
          generation: next.generation,
          records: next.records,
        }),
      );
      this.publish({ ...next, persistent: true, notice: null });
    } catch {
      this.publish({
        ...next,
        persistent: false,
        notice: '本次体验已完成，但浏览器无法保存长期进度。',
      });
    }
  }
  private nextGeneration() {
    const timestamp = Math.max(
      this.options.now?.() ?? Date.now(),
      Number.parseInt(this.snapshot.generation, 10) + 1 || 0,
    );
    return `${String(timestamp).padStart(16, '0')}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  }
  getSnapshot = () => this.snapshot;
  refresh = () => {
    const disk = this.read();
    const merged = this.merged(disk);
    this.publish(merged);
    // Best-effort repair of common same-generation lost updates. localStorage has no CAS/transaction.
    if (
      disk.persistent &&
      disk.generation === merged.generation &&
      JSON.stringify(disk.records) !== JSON.stringify(merged.records)
    )
      this.persist(merged);
  };
  save(input: unknown) {
    const record = completionRecordSchema.parse(input);
    const base = this.merged(this.read());
    this.persist({ ...base, records: mergeRecords(base.records, [record]) });
  }
  clear() {
    this.publish(this.merged(this.read()));
    this.persist({
      records: [],
      generation: this.nextGeneration(),
      persistent: true,
      notice: null,
    });
  }
  private onStorage = (event: StorageEvent) => {
    if (event.key !== COMPLETION_STORAGE_KEY && event.key !== null) return;
    if (event.storageArea) {
      try {
        if (event.storageArea !== this.options.storage()) return;
      } catch {
        return;
      }
    }
    if (event.newValue === null) {
      this.publish({
        ...this.read(),
        records: [],
        generation: this.nextGeneration(),
      });
      return;
    }
    // Read current storage rather than trusting a potentially delayed event payload.
    this.refresh();
  };
  subscribe = (listener: () => void) => {
    if (this.listeners.size === 0)
      this.options.events?.addEventListener(
        'storage',
        this.onStorage as EventListener,
      );
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0)
        this.options.events?.removeEventListener(
          'storage',
          this.onStorage as EventListener,
        );
    };
  };
}
export function createBrowserCompletionStore() {
  return new CompletionStore({
    storage: () => (typeof window === 'undefined' ? null : window.localStorage),
    events: typeof window === 'undefined' ? undefined : window,
  });
}
