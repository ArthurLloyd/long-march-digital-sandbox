import { useMemo, useState } from 'react';
import raw from '../../data/verified/dataset.json';
import { App } from '../../app/App';
import { CompletionStore } from '../../app/experience/experience-completion-service';
import { createCandidateReviewCatalog } from './candidate-review-catalog';
import '../../styles/global.css';
import '../../styles/ornaments.css';
import './c1-workbench.css';

export function C3Workbench() {
  const catalog = useMemo(() => createCandidateReviewCatalog(raw), []);
  const [store] = useState(
    () =>
      new CompletionStore({
        key: 'long-march.development.c3-candidate-completion.v1',
        storage: () => localStorage,
        events: window,
      }),
  );
  return (
    <>
      <aside
        className="reading-section"
        style={{ padding: '16px 32px', background: '#351820' }}
        role="note"
      >
        <strong>历史候选资料，尚未完成人工复核。</strong>
        <p>
          C3 本地联调 · 原始审核字段保持
          draft/unpublished；本页完成记录仅用于工程验证，不代表史实通过，不解锁正式展馆。
        </p>
        <a href="/src/features/history/review/index.html">B 候选资料审阅</a>
        {' · '}
        <a href="/__dev/contracts">返回接口工作台</a>
      </aside>
      <App developmentCatalog={catalog} completionStore={store} />
    </>
  );
}
