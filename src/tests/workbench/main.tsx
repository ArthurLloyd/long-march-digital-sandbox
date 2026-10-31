import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ContractWorkbench } from './ContractWorkbench';
import './workbench.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContractWorkbench />
  </StrictMode>,
);
