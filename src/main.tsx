import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initLang } from './hooks/useLang.ts'
import './index.css'

initLang()

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
