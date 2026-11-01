import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
if (new URLSearchParams(window.location.search).get('flow') === 'c2') {
  const { C2Workbench } = await import('./C2Workbench');
  root.render(
    <StrictMode>
      <C2Workbench />
    </StrictMode>,
  );
} else if (new URLSearchParams(window.location.search).get('flow') === 'c1') {
  const { C1Workbench } = await import('./C1Workbench');
  root.render(
    <StrictMode>
      <C1Workbench />
    </StrictMode>,
  );
} else {
  const { ContractWorkbench } = await import('./ContractWorkbench');
  await import('./workbench.css');
  root.render(
    <StrictMode>
      <ContractWorkbench />
    </StrictMode>,
  );
}
