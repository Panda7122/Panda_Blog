import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'highlight.js/styles/atom-one-light.css';
import 'katex/dist/katex.min.css';
import './styles.css';
import App from './App';
import { config } from './config';

document.title = config.siteTitle;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
