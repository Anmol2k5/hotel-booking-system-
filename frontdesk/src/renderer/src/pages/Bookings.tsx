import { useState, useEffect } from 'react'
import { Search, Plus, Filter, X } from 'lucide-react'
import type { LocalBooking, LocalRoom, LocalGuest } from '../global'
import { v4 as uuidv4 } from 'uuid'
import { format, differenceInDays } from 'date-fns'

const tabs = ['All', 'Confirmed', 'Checked In', 'Checked Out', 'Pending', 'Cancelled']
const statusMap: Record<string, string> = {
  'All': '', 'Confirmed': 'confirmed', 'Checked In': 'checkedin',
  'Checked Out': 'checkedout', 'Pending': 'pending', 'Cancelled': 'cancelled'
}
const sources = ['Direct', 'Walk-in', 'MakeMyTrip', 'Booking.com', 'Airbnb', 'Agoda', 'Expedia']

export default function Bookings() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [bookings, setBookings] = useState<LocalBooking[]>([])
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [guests, setGuests] = useState<LocalGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadData = async () => {
    try {
      const [b, r, g] = await Promise.all([
        window.electronAPI.db.getBookings(),
        window.electronAPI.db.getRooms(),
        window.electronAPI.db.getGuests()
      ])
      setBookings(b)
      setRooms(r)
      setGuests(g)
    } catch (e) {
      console.error('Failed to load bookings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = bookings.filter(b => {
    const targetStatus = statusMap[activeTab]
    const matchTab = !targetStatus || b.status === targetStatus
    const matchSearch = b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_phone.includes(search)
    return matchTab && matchSearch
  })

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

  const handleBookingCreated = () => {
    setShowModal(false)
    loadData()
  }

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
              placeholder="Search guest, booking ID, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
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
              <th>Nights</th>
              <th>Amount</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading bookings...</td></tr>
            ) : filtered.length > 0 ? filtered.map(b => {
              const nights = differenceInDays(new Date(b.check_out_date), new Date(b.check_in_date))
              const room = rooms.find(r => r.id === b.room_id)
              return (
                <tr key={b.id}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.booking_ref}</td>
                  <td>
                    <div className="primary">{b.guest_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.guest_phone}</div>
                  </td>
                  <td>
                    <div className="primary">{room?.number || b.room_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room?.type_name || ''}</div>
                  </td>
                  <td>{b.check_in_date}</td>
                  <td>{b.check_out_date}</td>
                  <td>{nights}N</td>
                  <td className="primary">{formatCurrency(b.total_amount)}</td>
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
                  <td><span className={`badge ${b.status}`}>{b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {b.status === 'confirmed' && (
                        <button className="btn btn-success btn-sm" onClick={() => { window.location.hash = '/checkin' }}>Check In</button>
                      )}
                      {b.status === 'checkedin' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { window.location.hash = '/checkout' }}>Check Out</button>
                      )}
                      <button className="btn btn-ghost btn-sm">View</button>
                    </div>
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && <NewBookingModal rooms={rooms} guests={guests} onClose={() => setShowModal(false)} onCreated={handleBookingCreated} />}
    </>
  )
}

function NewBookingModal({ rooms, guests, onClose, onCreated }: {
  rooms: LocalRoom[]
  guests: LocalGuest[]
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState(1)
  const [selectedGuest, setSelectedGuest] = useState<LocalGuest | null>(null)
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [selectedRoom, setSelectedRoom] = useState<LocalRoom | null>(null)
  const [dates, setDates] = useState({ checkIn: format(new Date(), 'yyyy-MM-dd'), checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd') })
  const [details, setDetails] = useState({ adults: 1, children: 0, source: 'Direct', notes: '' })
  const [saving, setSaving] = useState(false)

  const availableRooms = rooms.filter(r => r.status === 'available')
  const nights = Math.max(1, differenceInDays(new Date(dates.checkOut), new Date(dates.checkIn)))
  const total = selectedRoom ? selectedRoom.rate * nights : 0

  const handleCreateGuest = async () => {
    if (!newGuest.firstName || !newGuest.lastName || !newGuest.phone) return
    const guest: LocalGuest = {
      id: uuidv4(),
      property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      first_name: newGuest.firstName,
      last_name: newGuest.lastName,
      phone: newGuest.phone,
      email: newGuest.email,
      city: '',
      vip: 0,
      total_stays: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    const created = await window.electronAPI.db.createGuest(guest)
    setSelectedGuest(created)
    setStep(2)
  }

  const handleCreateBooking = async () => {
    if (!selectedRoom || !selectedGuest) return
    setSaving(true)
    try {
      const bookingRef = `BK-${String(Date.now()).slice(-6)}`
      const baseAmount = selectedRoom.rate * nights
      const taxAmount = Math.round(baseAmount - baseAmount / 1.12)
      const totalAmount = baseAmount + taxAmount

      const booking: LocalBooking = {
        id: uuidv4(),
        booking_ref: bookingRef,
        property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        room_id: selectedRoom.id,
        guest_id: selectedGuest.id,
        guest_name: `${selectedGuest.first_name} ${selectedGuest.last_name}`,
        guest_phone: selectedGuest.phone,
        guest_email: selectedGuest.email || '',
        check_in_date: dates.checkIn,
        check_out_date: dates.checkOut,
        adults: details.adults,
        children: details.children,
        room_rate: selectedRoom.rate,
        base_amount: baseAmount,
        tax_amount: taxAmount,
        extras_amount: 0,
        total_amount: totalAmount,
        status: 'confirmed',
        source: details.source,
        notes: details.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await window.electronAPI.db.createBooking(booking)
      onCreated()
    } catch (e) {
      console.error('Failed to create booking:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640 }}>
        <div className="modal-header">
          <div className="modal-title">New Booking</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--accent)' : 'var(--bg-elevated)' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>Select or Create Guest</div>

            <div className="search-bar" style={{ width: '100%' }}>
              <Search size={14} />
              <input
                placeholder="Search existing guests..."
                onChange={async (e) => {
                  if (e.target.value.length > 2) {
                    const results = await window.electronAPI.db.searchGuests(e.target.value)
                    // Could show dropdown here
                  }
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {guests.slice(0, 8).map(g => (
                <div
                  key={g.id}
                  onClick={() => { setSelectedGuest(g); setStep(2) }}
                  style={{
                    padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', background: 'var(--bg-surface)', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{g.first_name} {g.last_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.phone}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Or create new guest</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={newGuest.firstName} onChange={e => setNewGuest({ ...newGuest, firstName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={newGuest.lastName} onChange={e => setNewGuest({ ...newGuest, lastName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input className="form-input" value={newGuest.phone} onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={newGuest.email} onChange={e => setNewGuest({ ...newGuest, email: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleCreateGuest} disabled={!newGuest.firstName || !newGuest.lastName || !newGuest.phone}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>
              Room & Dates {selectedGuest && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>· {selectedGuest.first_name} {selectedGuest.last_name}</span>}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Check-In Date</label>
                <input className="form-input" type="date" value={dates.checkIn} onChange={e => setDates({ ...dates, checkIn: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Check-Out Date</label>
                <input className="form-input" type="date" value={dates.checkOut} onChange={e => setDates({ ...dates, checkOut: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Select Room ({availableRooms.length} available)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {availableRooms.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoom(r)}
                    style={{
                      padding: 12, borderRadius: 'var(--radius-sm)', border: `1px solid ${selectedRoom?.id === r.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', background: selectedRoom?.id === r.id ? 'var(--accent-subtle)' : 'var(--bg-surface)', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Room {r.number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.type_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>₹{r.rate}/night</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedRoom}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>Booking Details</div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Adults</label>
                <input className="form-input" type="number" min={1} max={6} value={details.adults} onChange={e => setDetails({ ...details, adults: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Children</label>
                <input className="form-input" type="number" min={0} max={4} value={details.children} onChange={e => setDetails({ ...details, children: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Booking Source</label>
                <select className="form-select" value={details.source} onChange={e => setDetails({ ...details, source: e.target.value })}>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={details.notes} onChange={e => setDetails({ ...details, notes: e.target.value })} />
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Booking Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Guest</span>
                <span>{selectedGuest?.first_name} {selectedGuest?.last_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Room</span>
                <span>{selectedRoom?.number} ({selectedRoom?.type_name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Dates</span>
                <span>{dates.checkIn} → {dates.checkOut} ({nights} nights)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Rate</span>
                <span>₹{selectedRoom?.rate} × {nights} nights</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>Total</span>
                <span style={{ color: 'var(--success)' }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={handleCreateBooking} disabled={saving}>
                {saving ? 'Creating...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
