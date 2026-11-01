import type { EquivalentExperienceProps } from '../../shared/contracts';
import styles from './history.module.css';

export function EquivalentExperience({
  content,
  activeStepId,
  onStepViewed,
}: EquivalentExperienceProps) {
  const index = content.steps.findIndex((s) => s.stepId === activeStepId);
  const step = content.steps[index];
  return (
    <section className={styles.root} aria-label="分步图文体验">
      <p className={styles.note}>
        分步图文与沉浸体验使用同一主线；互动由下方教学区提供。
      </p>
      {!step ? (
        <p role="status">等待调度器选择阅读步骤。</p>
      ) : (
        <article key={`${content.experienceId}:${step.stepId}`}>
          <h3>
            第 {index + 1} / {content.steps.length} 步
          </h3>
          <p className={styles.prose}>{step.text}</p>
          {step.interactionIds.length > 0 && (
            <p>
              本段互动：{step.interactionIds.join('、')}
              。请完成实际操作及解释确认。
            </p>
          )}
          <button type="button" onClick={() => onStepViewed(step.stepId)}>
            我已阅读本段
          </button>
        </article>
      )}
    </section>
  );
}
