import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Payments from './pages/Payments'
import Itineraries from './pages/Itineraries'
import Watermark from './pages/Watermark'
import Placards from './pages/Placards'
import Logs from './pages/Logs'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/itineraries" element={<Itineraries />} />
              <Route path="/watermark" element={<Watermark />} />
              <Route path="/placards" element={<Placards />} />
              <Route path="/logs" element={<Logs />} />
            </Routes>
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </Router>
  )
}

export default App