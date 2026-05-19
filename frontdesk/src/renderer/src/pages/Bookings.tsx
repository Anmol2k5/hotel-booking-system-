import { useState, useEffect } from 'react'
import { Search, Plus, Filter, X } from 'lucide-react'
import { PROPERTY_ID } from '../lib/supabase'
import type { LocalBooking, LocalRoom } from '../global'

const tabs = ['All', 'Confirmed', 'Checked In', 'Checked Out', 'Pending', 'Cancelled']

export default function Bookings() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [bookings, setBookings] = useState<LocalBooking[]>([])
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [roomRate, setRoomRate] = useState(0)
  const [source, setSource] = useState('Direct')

  // Load data
  const loadData = () => {
    window.electronAPI.db.getBookings().then(setBookings)
    window.electronAPI.db.getRooms().then(setRooms)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-fill room rate when room changes
  useEffect(() => {
    const selectedRoom = rooms.find(r => r.id === selectedRoomId)
    if (selectedRoom) {
      setRoomRate(selectedRoom.rate)
    }
  }, [selectedRoomId, rooms])

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName || !guestPhone || !selectedRoomId) {
      alert('Please fill out all required fields')
      return
    }

    const selectedRoom = rooms.find(r => r.id === selectedRoomId)
    if (!selectedRoom) return

    const newBooking: LocalBooking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      booking_ref: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      property_id: PROPERTY_ID || '',
      room_id: selectedRoomId,
      guest_id: `guest-${Math.random().toString(36).substring(2, 9)}`,
      guest_name: guestName,
      guest_phone: guestPhone,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      adults: Number(adults),
      children: Number(children),
      room_rate: Number(roomRate),
      status: 'confirmed',
      source: source,
      created_at: new Date().toISOString()
    }

    try {
      await window.electronAPI.db.createBooking(newBooking)
      // Update local room status to reserved
      await window.electronAPI.db.updateRoomStatus(selectedRoomId, 'reserved')
      
      // Reset form & close
      setGuestName('')
      setGuestPhone('')
      setSelectedRoomId('')
      setAdults(1)
      setChildren(0)
      setSource('Direct')
      setShowModal(false)
      loadData()
    } catch (err) {
      console.error('Failed to create booking:', err)
      alert('Failed to save booking locally')
    }
  }

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.number : '—'
  }

  const getRoomType = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room ? room.type_name : '—'
  }

  const filtered = bookings.filter(b => {
    const matchTab = activeTab === 'All' ||
      (activeTab === 'Confirmed' && b.status === 'confirmed') ||
      (activeTab === 'Checked In' && b.status === 'checkedin') ||
      (activeTab === 'Checked Out' && b.status === 'checkedout') ||
      (activeTab === 'Pending' && b.status === 'pending') ||
      (activeTab === 'Cancelled' && b.status === 'cancelled')
    const matchSearch = b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Bookings</div>
          <div className="page-subtitle">{bookings.length} total reservations</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          New Booking
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="filter-tabs">
          {tabs.map(t => (
            <button key={t} className={`filter-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <Search size={14} />
            <input
              placeholder="Search guest or booking ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary btn-sm">
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Guests</th>
              <th>Amount</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const checkIn = new Date(b.check_in_date)
              const checkOut = new Date(b.check_out_date)
              const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
              return (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.id}</td>
                  <td>
                    <div className="primary">{b.guest_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.guest_phone}</div>
                  </td>
                  <td>
                    <div className="primary">Room {getRoomNumber(b.room_id)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getRoomType(b.room_id)}</div>
                  </td>
                  <td>{b.check_in_date}</td>
                  <td>{b.check_out_date}</td>
                  <td>{b.adults}A {b.children > 0 ? `${b.children}C` : ''}</td>
                  <td className="primary">₹{(b.room_rate * nights).toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: b.source === 'Direct' ? 'var(--accent-subtle)' :
                        b.source === 'Walk-in' ? 'var(--success-subtle)' : 'rgba(255,255,255,0.05)',
                      color: b.source === 'Direct' ? 'var(--accent-hover)' :
                        b.source === 'Walk-in' ? 'var(--success)' : 'var(--text-muted)'
                    }}>{b.source}</span>
                  </td>
                  <td>
                    <span className={`badge ${b.status}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Search size={32} />
            <p>No bookings found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Reservation</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Guest Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter guest full name"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guest Phone *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Enter phone number"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Room Allocation *</label>
                  <select
                    className="form-select"
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} - {r.type_name} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Booking Source</label>
                  <select
                    className="form-select"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                  >
                    <option value="Direct">Direct</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="MakeMyTrip">MakeMyTrip</option>
                    <option value="Airbnb">Airbnb</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Check-In Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkInDate}
                    onChange={e => setCheckInDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-Out Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Adults</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="form-input"
                    value={adults}
                    onChange={e => setAdults(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Children</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="form-input"
                    value={children}
                    onChange={e => setChildren(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Room Rate (per night) *</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={roomRate}
                  onChange={e => setRoomRate(Number(e.target.value))}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
