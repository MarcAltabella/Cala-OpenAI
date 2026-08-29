import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './agent-ui.css';
import '@fontsource-variable/inter';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
