import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/cormorant-garamond'
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
import './styles.css'
import './workflows.css'
import { App } from './App'
import { StudioProvider } from './studio'
import './installation'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><HashRouter><StudioProvider><App /></StudioProvider></HashRouter></React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(console.error)
  })
}
