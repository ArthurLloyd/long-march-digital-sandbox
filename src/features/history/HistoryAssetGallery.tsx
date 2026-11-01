import { useState } from 'react';
import { type AssetReference } from '../../shared/contracts';
import styles from './history.module.css';

function AssetFigure({
  asset,
  review,
}: {
  asset: AssetReference;
  review: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={styles.assetFigure}>
      <h4>
        {asset.assetType === 'historical_photo'
          ? '真实历史照片'
          : asset.representation === 'ai_recreation'
            ? 'AI 生成艺术形象'
            : '艺术形象'}
      </h4>
      {failed ? (
        <p role="status">图片加载失败，文字与出处仍可阅读。</p>
      ) : (
        <a
          href={asset.filePath}
          target="_blank"
          rel="noreferrer"
          aria-label={`放大查看：${asset.title}`}
        >
          <img
            src={asset.filePath}
            alt={asset.title}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <figcaption>
        <strong>{asset.title}</strong>
        <p>{asset.disclosure}</p>
        <small>
          {asset.creator} · {asset.attribution}
        </small>
        <p>
          {/^https?:\/\//i.test(asset.origin) ? (
            <a href={asset.origin} target="_blank" rel="noreferrer">
              查看素材出处与元数据
            </a>
          ) : (
            asset.origin
          )}
        </p>
        <small>使用说明：{asset.rightsNote}</small>
        {review && (
          <p className={styles.note}>
            候选审阅 ·{' '}
            {asset.rightsStatus === 'cleared'
              ? '已整理使用依据，待真人复核'
              : '使用范围仍需核定'}{' '}
            · 未发布
          </p>
        )}
      </figcaption>
    </figure>
  );
}
/** Review mode is used only by the separate, dev-only content review entry. */
export function HistoryAssetGallery({
  assets,
  review = false,
}: {
  assets: readonly AssetReference[];
  review?: boolean;
}) {
  return (
    <section
      className={`${styles.root} ${styles.gallery}`}
      aria-label={review ? '候选照片与艺术形象配对' : '照片与艺术形象配对'}
    >
      {assets.map((a) => (
        <AssetFigure key={a.assetId + a.filePath} asset={a} review={review} />
      ))}
    </section>
  );
}
