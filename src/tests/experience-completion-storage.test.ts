import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPLETION_STORAGE_KEY,
  CompletionStore,
} from '../app/experience/experience-completion-service';
import {
  EXPERIENCE_IDS,
  requiredInteractionsFor,
  type CompletionRecord,
} from '../shared/contracts';

function record(index = 3, version = 1): CompletionRecord {
  const experienceId = EXPERIENCE_IDS[index]!;
  return {
    schemaVersion: 1,
    experienceId,
    completionPolicyVersion: version,
    completedAt: '2026-11-01T00:00:00Z',
    completedInteractionIds: [...requiredInteractionsFor(experienceId)],
    completionMode: '3d',
  };
}
const make = () =>
  new CompletionStore({ storage: () => localStorage, events: window });
beforeEach(() => localStorage.clear());
describe('C1 版本化浏览器记忆', () => {
  it('错误的缓存规则版本不会阻塞用户重新完成当前规则', () => {
    const store = make();
    store.save(record(3, 99));
    store.save(record(3, 1));
    expect(
      make()
        .getSnapshot()
        .records.some((item) => item.completionPolicyVersion === 1),
    ).toBe(true);
    expect(
      make()
        .getSnapshot()
        .records.some((item) => item.completionPolicyVersion === 99),
    ).toBe(true);
  });
  it('迟到的删除事件不能抹掉当前磁盘的新完成记录；开发键与正式键隔离', () => {
    const store = make();
    const off = store.subscribe(vi.fn());
    store.save(record());
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: COMPLETION_STORAGE_KEY,
        newValue: null,
      }),
    );
    expect(store.getSnapshot().records).toHaveLength(1);
    const dev = new CompletionStore({
      key: 'development-only',
      storage: () => localStorage,
    });
    dev.save(record(0));
    expect(make().getSnapshot().records[0]?.experienceId).toBe(
      record().experienceId,
    );
    off();
  });
  it('六个体验独立持久化，刷新读取，不存全文', () => {
    const store = make();
    EXPERIENCE_IDS.forEach((_, index) => store.save(record(index)));
    expect(make().getSnapshot().records).toHaveLength(6);
    expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).not.toContain(
      'detail',
    );
  });
  it('读前合并和 storage 同步，不用未完成状态覆盖另一个标签', () => {
    const a = make(),
      b = make();
    const unsubscribe = b.subscribe(vi.fn());
    a.save(record(0));
    b.save(record(1));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: COMPLETION_STORAGE_KEY,
        newValue: 'delayed-event-payload',
      }),
    );
    expect(b.getSnapshot().records).toHaveLength(2);
    expect(make().getSnapshot().records).toHaveLength(2);
    a.save(record(2));
    expect(make().getSnapshot().records).toHaveLength(3);
    unsubscribe();
  });
  it('清除代际阻止旧标签缓存复活；清除不改其他浏览器数据', () => {
    const a = make(),
      b = make();
    a.save(record(0));
    b.refresh();
    localStorage.setItem('unrelated', 'keep');
    a.clear();
    b.save(record(1));
    expect(
      make()
        .getSnapshot()
        .records.map((r) => r.experienceId),
    ).toEqual([EXPERIENCE_IDS[1]]);
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });
  it('损坏 JSON、未知 envelope、无效记录不会崩溃，有效项可恢复', () => {
    for (const text of [
      '{bad',
      JSON.stringify({ schemaVersion: 7 }),
      JSON.stringify({
        schemaVersion: 1,
        generation: '0',
        records: [record(), { broken: true }],
      }),
    ]) {
      localStorage.setItem(COMPLETION_STORAGE_KEY, text);
      expect(() => make()).not.toThrow();
      expect(make().getSnapshot().notice).not.toBeNull();
    }
    expect(make().getSnapshot().records).toHaveLength(1);
  });
  it('读取拒绝、写入空间不足均保留会话内完成，并允许清除', () => {
    const denied = new CompletionStore({
      storage: () => {
        throw new Error('denied');
      },
    });
    denied.save(record());
    expect(denied.getSnapshot().records).toHaveLength(1);
    expect(denied.getSnapshot().persistent).toBe(false);
    const quota = new CompletionStore({
      storage: () => ({
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
      }),
    });
    quota.save(record());
    expect(quota.getSnapshot().records).toHaveLength(1);
    expect(quota.getSnapshot().notice).toContain('本次体验已完成');
    quota.clear();
    expect(quota.getSnapshot().records).toHaveLength(0);
  });
  it('旧规则记录不能覆盖较新的规则，非法 ID 或日期拒绝保存', () => {
    const store = make();
    store.save(record(3, 2));
    store.save(record(3, 1));
    expect(store.getSnapshot().records[0]?.completionPolicyVersion).toBe(2);
    expect(() =>
      store.save({ ...record(), experienceId: 'unknown' }),
    ).toThrow();
    expect(() => store.save({ ...record(), completedAt: 'unknown' })).toThrow();
  });
  it('外部 removeItem/clear 事件也能清理当前标签的记忆', () => {
    const store = make();
    const off = store.subscribe(vi.fn());
    store.save(record());
    localStorage.removeItem(COMPLETION_STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: COMPLETION_STORAGE_KEY,
        newValue: null,
      }),
    );
    expect(store.getSnapshot().records).toHaveLength(0);
    off();
  });
});
