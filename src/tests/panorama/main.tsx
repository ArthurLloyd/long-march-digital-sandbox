import { createRoot } from 'react-dom/client';
import candidate from '../../data/verified/dataset.json';
import { validateDataset } from '../../shared/utils/validate-dataset';
import { normalizeDataset } from '../../shared/contracts';
import { PanoramaApp } from '../../app/panorama/PanoramaApp';
import '../../styles/global.css';

if (!import.meta.env.DEV) throw new Error('全景候选原型仅允许在开发环境运行');
const data = normalizeDataset(validateDataset(candidate));
createRoot(document.getElementById('root')!).render(
  <PanoramaApp candidate={data} />,
);
