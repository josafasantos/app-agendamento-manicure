import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker do PWA imediatamente e atualiza automaticamente
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
