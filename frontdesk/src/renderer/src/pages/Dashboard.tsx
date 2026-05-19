import { useState, useEffect } from 'react'
import { BedDouble, Users, LogIn, LogOut, CalendarCheck, Wrench, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LocalBooking, LocalRoom } from '../global'

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  checkout: 'Due Out',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [bookings, setBookings] = useState<LocalBooking[]>([])

  const loadData = () => {
    window.electronAPI.db.getRooms().then(setRooms)
    window.electronAPI.db.getBookings().then(setBookings)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status === 'occupied').length
  const checkouts = rooms.filter(r => r.status === 'checkout').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  const todayStr = new Date().toISOString().split('T')[0]

  // Filter bookings relevant to today's operations
  // Check-ins: check-in is today & status is confirmed
  // Check-outs: check-out is today & status is checkedin
  const todayActivity = bookings.filter(b => {
    const isTodayCheckin = b.check_in_date === todayStr && b.status === 'confirmed'
    const isTodayCheckout = b.check_out_date === todayStr && b.status === 'checkedin'
    return isTodayCheckin || isTodayCheckout
  })

  const handleActivityAction = async (booking: LocalBooking) => {
    try {
      if (booking.status === 'confirmed') {
        // Process Check-In
        await window.electronAPI.db.updateBookingStatus(booking.id, 'checkedin')
        await window.electronAPI.db.updateRoomStatus(booking.room_id, 'occupied')
      } else if (booking.status === 'checkedin') {
        // Process Check-Out
        await window.electronAPI.db.updateBookingStatus(booking.id, 'checkedout')
        await window.electronAPI.db.updateRoomStatus(booking.room_id, 'checkout')
      }
      loadData()
    } catch (err) {
      console.error('Failed to update status from dashboard:', err)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back · Today's overview</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bookings')}>
          <CalendarCheck size={15} />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card success" onClick={() => navigate('/rooms')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <span className="stat-label">Available</span>
            <div className="stat-icon success"><BedDouble size={16} /></div>
          </div>
          <div className="stat-value">{available}</div>
          <div className="stat-change">Rooms ready to book</div>
        </div>
        <div className="stat-card accent" onClick={() => navigate('/rooms')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <span className="stat-label">Occupied</span>
            <div className="stat-icon accent"><Users size={16} /></div>
          </div>
          <div className="stat-value">{occupied}</div>
          <div className="stat-change">In-house guests</div>
        </div>
        <div className="stat-card warning" onClick={() => navigate('/checkout')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <span className="stat-label">Due Checkout</span>
            <div className="stat-icon warning"><LogOut size={16} /></div>
          </div>
          <div className="stat-value">{checkouts}</div>
          <div className="stat-change">By 12:00 PM today</div>
        </div>
        <div className="stat-card danger" onClick={() => navigate('/rooms')} style={{ cursor: 'pointer' }}>
          <div className="stat-header">
            <span className="stat-label">Maintenance</span>
            <div className="stat-icon danger"><Wrench size={16} /></div>
          </div>
          <div className="stat-value">{maintenance}</div>
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
            <div key={room.number} className={`room-card ${room.status}`} onClick={() => navigate('/rooms')}>
              <div className="room-number">{room.number}</div>
              <div className="room-type">{room.type_name}</div>
              <div className={`room-status-badge ${room.status}`}>{statusLabel[room.status]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Activity */}
      <div>
        <div className="section-header">
          <span className="section-title">Today's Activity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
            <Clock size={13} /> Live updates
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
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayActivity.map(b => (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.id}</td>
                  <td className="primary">{b.guest_name}</td>
                  <td>Room {rooms.find(r => r.id === b.room_id)?.number || '—'}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {b.status === 'confirmed'
                        ? <LogIn size={13} color="var(--success)" />
                        : <LogOut size={13} color="var(--warning)" />}
                      {b.status === 'confirmed' ? 'Check-In' : 'Check-Out'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${b.status}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleActivityAction(b)}>
                      {b.status === 'confirmed' ? 'Check In' : 'Check Out'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {todayActivity.length === 0 && (
            <div className="empty-state">
              <Clock size={32} />
              <p>No activity scheduled for today</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
