import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { initErrorReporting } from './utils/errorReporting'
import './styles/index.css'

initErrorReporting()

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  const swUrl = `${import.meta.env.BASE_URL}service-worker.js`
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.error('Service Worker registration failed:', err)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
