import './lib/armazenamento'
import './lib/instalar'
import { StrictMode } from 'react'
import '@fontsource-variable/figtree/wght.css'
import { createRoot } from 'react-dom/client'
import './ds/tokens.css'
import './ds/componentes.css'
import './index.css'
import App from './App.tsx'
import { MotionConfig } from 'motion/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_SEM_SW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* ambiente sem service worker */ })
  })
}
