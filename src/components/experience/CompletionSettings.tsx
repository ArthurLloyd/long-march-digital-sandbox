import { useState } from 'react';
export function CompletionSettings({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <section className="reading-section">
      <h3>体验记录</h3>
      <p>
        每个重点体验的完成记录保存在当前浏览器中，换设备或清理数据后可能需要重新体验。
      </p>
      {confirming ? (
        <>
          <p role="alert">
            将清除当前浏览器六个重点体验的完成状态，下次访问需重新体验。是否确认？
          </p>
          <button
            className="outlined-button"
            onClick={() => {
              onClear();
              setConfirming(false);
              setCleared(true);
            }}
          >
            确认清除体验记录
          </button>
          <button className="text-button" onClick={() => setConfirming(false)}>
            取消清除
          </button>
        </>
      ) : (
        <button className="outlined-button" onClick={() => setConfirming(true)}>
          清除体验记录
        </button>
      )}
      {cleared && <p role="status">当前浏览器的体验记录已清除。</p>}
    </section>
  );
}
