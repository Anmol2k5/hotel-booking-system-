import { useState, useEffect } from 'react'
import { LogIn, Search, CheckCircle } from 'lucide-react'
import type { LocalBooking, LocalRoom } from '../global'

export default function CheckIn() {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [bookings, setBookings] = useState<LocalBooking[]>([])
  const [rooms, setRooms] = useState<LocalRoom[]>([])

  const loadData = () => {
    window.electronAPI.db.getBookings().then(setBookings)
    window.electronAPI.db.getRooms().then(setRooms)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter bookings that are 'confirmed' (ready to check in)
  const arrivals = bookings.filter(b => b.status === 'confirmed')

  const filtered = arrivals.filter(a =>
    a.guest_name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search)
  )

  const handleCheckIn = async (bookingId: string, roomId: string) => {
    try {
      // 1. Update booking status to 'checkedin'
      await window.electronAPI.db.updateBookingStatus(bookingId, 'checkedin')
      // 2. Update room status to 'occupied'
      await window.electronAPI.db.updateRoomStatus(roomId, 'occupied')
      
      setSelected(null)
      loadData()
    } catch (err) {
      console.error('Failed to check in:', err)
      alert('Error saving check-in offline')
    }
  }

  const selectedBooking = arrivals.find(a => a.id === selected)

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.number : '—'
  }

  const getRoomType = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.type_name : '—'
  }

  const getStayNights = (checkin: string, checkout: string) => {
    const checkIn = new Date(checkin)
    const checkOut = new Date(checkout)
    return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Check In</div>
          <div className="page-subtitle">{arrivals.length} arrivals pending today</div>
        </div>
        <div className="search-bar">
          <Search size={14} />
          <input placeholder="Search guest or booking ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Guests</th>
                <th>Amount</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const nights = getStayNights(a.check_in_date, a.check_out_date)
                return (
                  <tr key={a.id} onClick={() => setSelected(a.id)} style={{ cursor: 'pointer' }}>
                    <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{a.id}</td>
                    <td>
                      <div className="primary">{a.guest_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.guest_phone}</div>
                    </td>
                    <td>
                      <div className="primary">Room {getRoomNumber(a.room_id)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getRoomType(a.room_id)}</div>
                    </td>
                    <td>{a.check_in_date} → {a.check_out_date}</td>
                    <td>{a.adults}A {a.children > 0 ? `${a.children}C` : ''}</td>
                    <td className="primary">₹{(a.room_rate * nights).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)'
                      }}>{a.source}</span>
                    </td>
                    <td>
                      <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); handleCheckIn(a.id, a.room_id) }}>
                        <LogIn size={12} /> Check In
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={32} />
              <p>No arrivals found</p>
            </div>
          )}
        </div>

        {selectedBooking && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>Guest Details</div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBooking.guest_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selectedBooking.guest_phone}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className="badge confirmed">
                  ✓ Booking Confirmed
                </span>
              </div>
            </div>

            {[
              ['Booking ID', selectedBooking.id],
              ['Room', `Room ${getRoomNumber(selectedBooking.room_id)} · ${getRoomType(selectedBooking.room_id)}`],
              ['Check-In', selectedBooking.check_in_date],
              ['Check-Out', selectedBooking.check_out_date],
              ['Duration', `${getStayNights(selectedBooking.check_in_date, selectedBooking.check_out_date)} Nights`],
              ['Guests', `${selectedBooking.adults} Adults${selectedBooking.children ? `, ${selectedBooking.children} Children` : ''}`],
              ['Total Amount', `₹${(selectedBooking.room_rate * getStayNights(selectedBooking.check_in_date, selectedBooking.check_out_date)).toLocaleString('en-IN')}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-success" style={{ flex: 2 }} onClick={() => handleCheckIn(selectedBooking.id, selectedBooking.room_id)}>
                <LogIn size={14} /> Confirm Check-In
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
