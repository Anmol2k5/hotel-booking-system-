import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { SyncEngine } from './lib/syncEngine'
import Sidebar from './components/Sidebar'
import Titlebar from './components/Titlebar'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import CheckIn from './pages/CheckIn'
import CheckOut from './pages/CheckOut'
import Guests from './pages/Guests'
import Rooms from './pages/Rooms'
import Settings from './pages/Settings'

export default function App() {
  useEffect(() => {
    SyncEngine.startAutoSync(10000)
  }, [])

  return (
    <div className="app-layout">
      <Titlebar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/checkout" element={<CheckOut />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
