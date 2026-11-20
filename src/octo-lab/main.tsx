/** Laboratório do Octo (só desenvolvimento): `npm run dev` e abrir /octo.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Lab } from './Lab.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');
createRoot(root).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
);
