import dataset from './dataset.json';
import { getPublishedDataset } from '../../shared/utils/validate-dataset';

export const publishedDataset = getPublishedDataset(dataset);
