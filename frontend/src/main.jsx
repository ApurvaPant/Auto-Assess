import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext.jsx' // For teacher auth

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
        <AuthProvider> {/* Wrap App with AuthProvider */}
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: '8px',
                  background: '#333', // Dark background for toasts
                  color: '#fff', // Light text for toasts
                },
              }}
            />
        </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)