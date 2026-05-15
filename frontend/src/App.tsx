import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Payments from './pages/Finance'
import Itineraries from './pages/Itineraries'
import Watermark from './pages/Watermark'
import Placards from './pages/Placards'
import Logs from './pages/Logs'
import Vendors from './pages/Vendors'
import { Toaster } from 'react-hot-toast'
import { useUserStore } from './stores/userStore'

function App() {
  const { loadFromStorage, isAuthenticated, token } = useUserStore()

  // Load user from storage and set axios defaults
  useEffect(() => {
    loadFromStorage()
    
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
  }, [loadFromStorage])

  return (
    <Router>
      {isAuthenticated ? (
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute requiredPermissions={['view_payments']} requireAny>
                      <Payments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/itineraries"
                  element={
                    <ProtectedRoute requiredPermissions={['view_itineraries']} requireAny>
                      <Itineraries />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendors"
                  element={
                    <ProtectedRoute requiredPermissions={['view_itineraries']} requireAny>
                      <Vendors />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/watermark"
                  element={
                    <ProtectedRoute requiredPermissions={['manage_watermarks']}>
                      <Watermark />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/placards"
                  element={
                    <ProtectedRoute requiredPermissions={['manage_placards']}>
                      <Placards />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <ProtectedRoute requiredPermissions={['view_logs']}>
                      <Logs />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
      <Toaster position="top-right" />
    </Router>
  )
}

export default App