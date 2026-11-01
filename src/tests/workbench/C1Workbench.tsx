import { useMemo, useState } from 'react';
import { App } from '../../app/App';
import { CompletionStore } from '../../app/experience/experience-completion-service';
import { EXPERIENCE_IDS } from '../../shared/contracts';
import { simulatePublishedSample } from '../fixtures/c1-sample';
import { engineeringModules } from './c1-modules';
import '../../styles/global.css';
import '../../styles/ornaments.css';

export function C1Workbench() {
  const [id, setId] = useState<(typeof EXPERIENCE_IDS)[number]>(
    'exp-feiduo-ludingqiao',
  );
  const data = useMemo(() => simulatePublishedSample(id), [id]);
  const [store] = useState(
    () =>
      new CompletionStore({
        key: 'long-march.development.c1-completion.v1',
        storage: () => localStorage,
        events: window,
      }),
  );
  return (
    <>
      <aside
        className="reading-section"
        style={{ padding: '16px 32px', background: '#351820' }}
      >
        <strong>
          C1 工程调度验证 ·
          全部内容与审核结构为内存模拟，非史实、非真人审核、非成品视频。
        </strong>
        <p>开发记录使用独立存储键，不会解锁正式展馆。</p>
        <label>
          选择工程体验{' '}
          <select
            value={id}
            onChange={(event) => {
              const value = EXPERIENCE_IDS.find(
                (item) => item === event.target.value,
              );
              if (value) setId(value);
            }}
          >
            {EXPERIENCE_IDS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <a href="/__dev/contracts">返回 C0 接口工作台</a>
      </aside>
      <App
        key={id}
        input={data}
        modules={engineeringModules}
        completionStore={store}
      />
    </>
  );
}
