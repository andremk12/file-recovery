import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyRendererSettings, loadAppSettings } from './services/appSettings.js'


applyRendererSettings(
  loadAppSettings()
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
