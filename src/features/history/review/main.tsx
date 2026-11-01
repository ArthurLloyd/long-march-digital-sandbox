import { createRoot } from 'react-dom/client';
import raw from '../../../data/verified/dataset.json';
import { normalizeDataset } from '../../../shared/contracts';
import { validateDataset } from '../../../shared/utils/validate-dataset';
import { ReviewPanel } from './ReviewPanel';

// A dev-only HTML entry; never imported or re-exported by the production module.
const node = document.getElementById('b-review-root');
if (node && import.meta.env.DEV) {
  try {
    const dataset = normalizeDataset(validateDataset(raw));
    createRoot(node).render(<ReviewPanel dataset={dataset} />);
  } catch (error) {
    node.textContent = `候选数据校验失败：${error instanceof Error ? error.message : String(error)}`;
  }
} else if (node) node.textContent = '候选审阅入口仅供本地开发使用。';
