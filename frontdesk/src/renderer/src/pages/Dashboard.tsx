import { BedDouble, Users, LogIn, LogOut, TrendingUp, CalendarCheck, Wrench, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { LocalRoom, LocalBooking, AppStats } from '../global'

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  checkout: 'Due Out',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
}

export default function Dashboard() {
  const [stats, setStats] = useState<AppStats | null>(null)
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [todayActivity, setTodayActivity] = useState<LocalBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)

  const loadData = async () => {
    try {
      const [s, r, checkIns, checkOuts] = await Promise.all([
        window.electronAPI.db.getStats(),
        window.electronAPI.db.getRooms(),
        window.electronAPI.db.getTodayCheckIns(),
        window.electronAPI.db.getTodayCheckOuts()
      ])
      setStats(s)
      setRooms(r)
      const activity = [
        ...checkIns.map(b => ({ ...b, activityType: 'Check-In' as const })),
        ...checkOuts.map(b => ({ ...b, activityType: 'Check-Out' as const }))
      ].sort((a, b) => (a.check_in_date || '').localeCompare(b.check_in_date || ''))
      setTodayActivity(activity as any)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const iv = setInterval(loadData, 15000)
    return () => clearInterval(iv)
  }, [])

  if (loading) {
    return (
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back · Today's overview</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewBooking(true)}>
          <CalendarCheck size={15} />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-header">
            <span className="stat-label">Available</span>
            <div className="stat-icon success"><BedDouble size={16} /></div>
          </div>
          <div className="stat-value">{stats?.availableRooms ?? 0}</div>
          <div className="stat-change">Rooms ready to book</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-header">
            <span className="stat-label">Occupied</span>
            <div className="stat-icon accent"><Users size={16} /></div>
          </div>
          <div className="stat-value">{stats?.occupiedRooms ?? 0}</div>
          <div className="stat-change">of {stats?.totalRooms ?? 0} total rooms</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-header">
            <span className="stat-label">Due Checkout</span>
            <div className="stat-icon warning"><LogOut size={16} /></div>
          </div>
          <div className="stat-value">{stats?.checkoutRooms ?? 0}</div>
          <div className="stat-change">{stats?.todayCheckOuts ?? 0} today</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-header">
            <span className="stat-label">Maintenance</span>
            <div className="stat-icon danger"><Wrench size={16} /></div>
          </div>
          <div className="stat-value">{stats?.maintenanceRooms ?? 0}</div>
          <div className="stat-change">Under service</div>
        </div>
      </div>

      {/* Room Grid */}
      <div>
        <div className="section-header">
          <span className="section-title">Room Status</span>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            {['available', 'occupied', 'checkout', 'reserved', 'maintenance'].map(s => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background:
                  s === 'available' ? 'var(--success)' :
                  s === 'occupied' ? 'var(--accent)' :
                  s === 'checkout' ? 'var(--warning)' :
                  s === 'reserved' ? 'var(--info)' : 'var(--danger)'
                }} />
                {statusLabel[s]}
              </span>
            ))}
          </div>
        </div>
        <div className="room-grid">
          {rooms.map(room => (
            <div key={room.id} className={`room-card ${room.status}`}>
              <div className="room-number">{room.number}</div>
              <div className="room-type">{room.type_name}</div>
              <div className={`room-status-badge ${room.status}`}>{statusLabel[room.status] || room.status}</div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="empty-state">
              <BedDouble size={32} />
              <p>No rooms configured. Sync from server or add rooms.</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Activity */}
      <div>
        <div className="section-header">
          <span className="section-title">Today's Activity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
            <Clock size={13} /> {stats?.todayCheckIns ?? 0} check-ins · {stats?.todayCheckOuts ?? 0} check-outs
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Type</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayActivity.length > 0 ? todayActivity.map(b => (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.booking_ref}</td>
                  <td className="primary">{b.guest_name}</td>
                  <td>Room {b.room_id}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {b.activityType === 'Check-In'
                        ? <LogIn size={13} color="var(--success)" />
                        : <LogOut size={13} color="var(--warning)" />}
                      {b.activityType}
                    </span>
                  </td>
                  <td>{b.activityType === 'Check-In' ? b.check_in_date : b.check_out_date}</td>
                  <td><span className={`badge ${b.status}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      window.location.hash = b.activityType === 'Check-In' ? '/checkin' : '/checkout'
                    }}>
                      {b.activityType === 'Check-In' ? 'Check In' : 'Check Out'}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No activity today</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
