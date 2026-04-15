import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext.jsx' // For teacher auth
import { ThemeProvider } from './contexts/ThemeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider> {/* Wrap App with AuthProvider */}
            <App />
            <Toaster
              position="bottom-right"
              gutter={8}
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#18181b',
                  color: '#d4d4d8',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '450',
                  padding: '10px 14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  maxWidth: '340px',
                },
                success: {
                  iconTheme: { primary: '#22c55e', secondary: '#18181b' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#18181b' },
                },
              }}
            />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
