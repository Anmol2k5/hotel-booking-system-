import { BedDouble, Users, LogIn, LogOut, TrendingUp, CalendarCheck, Wrench, Clock } from 'lucide-react'

const rooms = [
  { number: '101', type: 'Deluxe', status: 'occupied', guest: 'Rajesh Kumar' },
  { number: '102', type: 'Standard', status: 'available', guest: null },
  { number: '103', type: 'Suite', status: 'checkout', guest: 'Priya Sharma' },
  { number: '104', type: 'Standard', status: 'available', guest: null },
  { number: '105', type: 'Deluxe', status: 'occupied', guest: 'Amit Singh' },
  { number: '106', type: 'Standard', status: 'maintenance', guest: null },
  { number: '107', type: 'Suite', status: 'reserved', guest: 'Neha Patel' },
  { number: '108', type: 'Standard', status: 'available', guest: null },
  { number: '201', type: 'Deluxe', status: 'occupied', guest: 'Vikram Rao' },
  { number: '202', type: 'Standard', status: 'available', guest: null },
  { number: '203', type: 'Suite', status: 'occupied', guest: 'Sunita Desai' },
  { number: '204', type: 'Deluxe', status: 'available', guest: null },
  { number: '205', type: 'Standard', status: 'checkout', guest: 'Ravi Mehta' },
  { number: '206', type: 'Standard', status: 'available', guest: null },
  { number: '207', type: 'Suite', status: 'reserved', guest: 'Kavya Nair' },
  { number: '208', type: 'Deluxe', status: 'available', guest: null },
]

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  checkout: 'Due Out',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
}

const todayBookings = [
  { id: 'BK-0041', guest: 'Arjun Kapoor', room: '109', type: 'Check-In', time: '14:00', status: 'confirmed' },
  { id: 'BK-0039', guest: 'Meera Iyer', room: '103', type: 'Check-Out', time: '11:00', status: 'checkedin' },
  { id: 'BK-0042', guest: 'Sanjay Gupta', room: '211', type: 'Check-In', time: '15:30', status: 'confirmed' },
  { id: 'BK-0038', guest: 'Divya Reddy', room: '205', type: 'Check-Out', time: '12:00', status: 'pending' },
]

export default function Dashboard() {
  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status === 'occupied').length
  const checkouts = rooms.filter(r => r.status === 'checkout').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back · Today's overview</div>
        </div>
        <button className="btn btn-primary">
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
          <div className="stat-value">{available}</div>
          <div className="stat-change">Rooms ready to book</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-header">
            <span className="stat-label">Occupied</span>
            <div className="stat-icon accent"><Users size={16} /></div>
          </div>
          <div className="stat-value">{occupied}</div>
          <div className="stat-change"><span>↑ 12%</span> vs yesterday</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-header">
            <span className="stat-label">Due Checkout</span>
            <div className="stat-icon warning"><LogOut size={16} /></div>
          </div>
          <div className="stat-value">{checkouts}</div>
          <div className="stat-change">By 12:00 PM today</div>
        </div>
        <div className="stat-card danger">
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
            <div key={room.number} className={`room-card ${room.status}`}>
              <div className="room-number">{room.number}</div>
              <div className="room-type">{room.type}</div>
              <div className={`room-status-badge ${room.status}`}>{statusLabel[room.status]}</div>
              {room.guest && <div className="room-guest">{room.guest}</div>}
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
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayBookings.map(b => (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.id}</td>
                  <td className="primary">{b.guest}</td>
                  <td>Room {b.room}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {b.type === 'Check-In'
                        ? <LogIn size={13} color="var(--success)" />
                        : <LogOut size={13} color="var(--warning)" />}
                      {b.type}
                    </span>
                  </td>
                  <td>{b.time}</td>
                  <td><span className={`badge ${b.status}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm">
                      {b.type === 'Check-In' ? 'Check In' : 'Check Out'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
