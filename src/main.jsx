import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installGlobalErrorHandler } from './lib/logError'
import './index.css'
import App from './App.jsx'

installGlobalErrorHandler()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
