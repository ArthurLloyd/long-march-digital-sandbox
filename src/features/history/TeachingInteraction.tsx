import { useId, useState } from 'react';
import type {
  InteractionDefinition,
  InteractionResponse,
  TeachingInteractionProps,
} from '../../shared/contracts';
import { assessResponse } from './interaction-state';
import styles from './history.module.css';
import { HistoryText } from './HistoryText';

const categories = {
  primary_source: '原始材料',
  editorial_summary: '编辑概述',
  artistic_recreation: '艺术表现',
} as const;
type Category = keyof typeof categories;
const contentLabels = {
  historical_fact: '史实材料',
  editorial_summary: '编辑概述',
  artistic_recreation: '艺术再现',
  teaching_simulation: '教学模拟',
};

export function TeachingInteraction(props: TeachingInteractionProps) {
  // New definitions get fresh local drafts; committed learning state belongs to C.
  return <InteractionForm key={JSON.stringify(props.interaction)} {...props} />;
}
function InteractionForm({
  interaction: d,
  response,
  explanationAcknowledged,
  onResponse,
  onExplanationAcknowledged,
}: TeachingInteractionProps) {
  const id = useId();
  const [selected, setSelected] = useState(
    response?.interactionType === 'evidence_selection'
      ? (response.selectedChoiceId ?? '')
      : '',
  );
  const [order, setOrder] = useState(
    response?.interactionType === 'sort_sequence'
      ? response.orderedChoiceIds
      : d.interactionType === 'sort_sequence'
        ? d.choices.map((c) => c.choiceId)
        : [],
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    response?.interactionType === 'material_matching'
      ? Object.fromEntries(
          response.pairs.map((p) => [p.materialId, p.conclusionId]),
        )
      : response?.interactionType === 'classify_source'
        ? Object.fromEntries(
            response.classifications.map((p) => [p.materialId, p.category]),
          )
        : {},
  );
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [error, setError] = useState('');
  const result = assessResponse(d, response);
  const locked = result.complete || explanationAcknowledged;
  const visited =
    response?.interactionType === 'observe_hotspots'
      ? response.visitedMaterialIds
      : [];
  function submit() {
    let value: InteractionResponse;
    switch (d.interactionType) {
      case 'observe_hotspots':
        return;
      case 'evidence_selection':
        value = {
          interactionType: d.interactionType,
          selectedChoiceId: selected || null,
        };
        break;
      case 'sort_sequence':
        value = { interactionType: d.interactionType, orderedChoiceIds: order };
        break;
      case 'material_matching':
        value = {
          interactionType: d.interactionType,
          pairs: d.materials.map((m) => ({
            materialId: m.materialId,
            conclusionId: answers[m.materialId] ?? '',
          })),
        };
        break;
      case 'classify_source':
        value = {
          interactionType: d.interactionType,
          classifications: d.materials.map((m) => ({
            materialId: m.materialId,
            category: answers[m.materialId] as Category,
          })),
        };
        break;
    }
    if (!assessResponse(d, value).complete) {
      setError('请完成全部选择；材料配对需一一对应。');
      return;
    }
    setError('');
    onResponse(d.interactionId, value);
  }
  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  }
  return (
    <section className={styles.root} aria-labelledby={`${id}-prompt`}>
      <h3 id={`${id}-prompt`}>{d.prompt}</h3>
      <p className={styles.note}>
        操作用于理解资料，历史进程与结果保持固定。完整尝试后可阅读解释继续。
      </p>
      {'materials' in d && (
        <div className={styles.materials}>
          {d.materials.map((m) => {
            const observation = d.interactionType === 'observe_hotspots';
            const seen = visited.includes(m.materialId);
            const blocked =
              observation &&
              d.visitOrder === 'listed' &&
              !seen &&
              d.requiredMaterialIds[visited.length] !== m.materialId;
            return (
              <div key={m.materialId} className={styles.card}>
                {observation ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={activeMaterial === m.materialId}
                      disabled={blocked || explanationAcknowledged}
                      onClick={() => setActiveMaterial(m.materialId)}
                    >
                      {m.title}
                      {seen ? '（已读）' : ''}
                    </button>
                    {blocked && <p>请先按顺序查看前一份材料。</p>}
                    {activeMaterial === m.materialId && (
                      <div>
                        <p className={styles.prose}>
                          <HistoryText text={m.text} />
                        </p>
                        <small>
                          {contentLabels[m.contentType]} · 来源：
                          {m.sourceIds.join('、') || '未提供'}
                        </small>
                        <p>
                          <button
                            type="button"
                            disabled={seen || locked}
                            onClick={() =>
                              onResponse(d.interactionId, {
                                interactionType: 'observe_hotspots',
                                visitedMaterialIds: [...visited, m.materialId],
                              })
                            }
                          >
                            {seen ? '已确认阅读' : '确认已阅读此材料'}
                          </button>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h4>{m.title}</h4>
                    <p className={styles.prose}>
                      <HistoryText text={m.text} />
                    </p>
                    <small>来源：{m.sourceIds.join('、') || '未提供'}</small>
                    <p>
                      <label>
                        {d.interactionType === 'classify_source'
                          ? '资料性质'
                          : '对应结论'}
                        ：
                        <select
                          disabled={locked}
                          value={answers[m.materialId] ?? ''}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [m.materialId]: e.target.value,
                            })
                          }
                        >
                          <option value="">请选择</option>
                          {d.interactionType === 'classify_source'
                            ? Object.entries(categories).map(([v, label]) => (
                                <option key={v} value={v}>
                                  {label}
                                </option>
                              ))
                            : d.conclusions.map((c) => (
                                <option
                                  key={c.conclusionId}
                                  value={c.conclusionId}
                                >
                                  {c.text}
                                </option>
                              ))}
                        </select>
                      </label>
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {d.interactionType === 'observe_hotspots' && (
        <p role="status">
          已阅读 {visited.length} / {d.requiredMaterialIds.length} 份材料
        </p>
      )}
      {d.interactionType === 'evidence_selection' && (
        <fieldset disabled={locked}>
          <legend>选择一条表述</legend>
          {d.choices.map((c) => (
            <label className={styles.choice} key={c.choiceId}>
              <input
                type="radio"
                name={id}
                value={c.choiceId}
                checked={selected === c.choiceId}
                onChange={() => setSelected(c.choiceId)}
              />
              {c.text}
            </label>
          ))}
        </fieldset>
      )}
      {d.interactionType === 'sort_sequence' && (
        <>
          <p>使用上移、下移按钮排列三个片段，再提交。</p>
          <ol>
            {order.map((choiceId, i) => (
              <li className={styles.card} key={choiceId}>
                <span>
                  {d.choices.find((c) => c.choiceId === choiceId)?.text}
                </span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={locked || i === 0}
                    aria-label={`第${i + 1}项上移`}
                    onClick={() => move(i, -1)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={locked || i === order.length - 1}
                    aria-label={`第${i + 1}项下移`}
                    onClick={() => move(i, 1)}
                  >
                    下移
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {d.interactionType !== 'observe_hotspots' && (
        <button type="button" disabled={locked} onClick={submit}>
          提交本次判断
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {result.complete && (
        <div className={styles.feedback} role="status">
          <h4>
            {result.correct ? '已完成本次操作' : '本次判断与资料依据不同'}
          </h4>
          <p>{d.feedback}</p>
          <p className={styles.prose}>
            <HistoryText text={d.explanation} />
          </p>
          <p>依据：{d.sourceIds.join('、')}</p>
          <button
            type="button"
            disabled={explanationAcknowledged}
            onClick={() => onExplanationAcknowledged(d.interactionId)}
          >
            {explanationAcknowledged ? '已确认解释' : '我已阅读并理解解释'}
          </button>
        </div>
      )}
    </section>
  );
}
// Keep this type dependency local to the public contract, without app imports.
export type HistoryInteractionDefinition = InteractionDefinition;
