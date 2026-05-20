import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, LogIn, LogOut,
  Users, BedDouble, Settings, Bell
} from 'lucide-react'
import { format } from 'date-fns'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/bookings', icon: CalendarDays, label: 'Bookings' },
  { to: '/checkin', icon: LogIn, label: 'Check In' },
  { to: '/checkout', icon: LogOut, label: 'Check Out' },
  { to: '/guests', icon: Users, label: 'Guests' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms' },
]

export default function Sidebar() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <aside className="sidebar">
      <span className="sidebar-section-label">Navigation</span>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon className="nav-icon" size={16} />
          {label}
        </NavLink>
      ))}

      <span className="sidebar-section-label" style={{ marginTop: 8 }}>System</span>
      <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <Settings className="nav-icon" size={16} />
        Settings
      </NavLink>

      <div className="sidebar-bottom">
        <div className="sidebar-clock">
          <div className="time">{format(time, 'HH:mm:ss')}</div>
          <div className="date">{format(time, 'EEE, dd MMM yyyy')}</div>
        </div>
      </div>
    </aside>
  )
}
