import { useState, useEffect } from 'react'
import { LogIn, Search, CheckCircle } from 'lucide-react'
import type { LocalBooking, LocalRoom } from '../global'
import { differenceInDays } from 'date-fns'

export default function CheckIn() {
  const [selected, setSelected] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [arrivals, setArrivals] = useState<LocalBooking[]>([])
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const loadData = async () => {
    try {
      const [checkIns, r] = await Promise.all([
        window.electronAPI.db.getTodayCheckIns(),
        window.electronAPI.db.getRooms()
      ])
      setArrivals(checkIns)
      setRooms(r)
    } catch (e) {
      console.error('Failed to load check-ins:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = arrivals.filter(a =>
    a.guest_name.toLowerCase().includes(search.toLowerCase()) || a.booking_ref.includes(search)
  )

  const handleCheckIn = async (id: string) => {
    setProcessing(true)
    try {
      const booking = arrivals.find(a => a.id === id)
      if (!booking) return

      await window.electronAPI.db.updateBooking(id, { status: 'checkedin' })
      await window.electronAPI.db.updateRoomStatus(booking.room_id, 'occupied', `Guest checked in: ${booking.guest_name}`)

      setCheckedIn(prev => [...prev, id])
      setSelected(null)
      await loadData()
    } catch (e) {
      console.error('Check-in failed:', e)
    } finally {
      setProcessing(false)
    }
  }

  const selectedBooking = arrivals.find(a => a.id === selected)
  const selectedRoom = selectedBooking ? rooms.find(r => r.id === selectedBooking.room_id) : null

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Check In</div>
          <div className="page-subtitle">{arrivals.length} arrivals today</div>
        </div>
        <div className="search-bar">
          <Search size={14} />
          <input placeholder="Search guest or booking ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading arrivals...</div>
      ) : (
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(a => {
                  const room = rooms.find(r => r.id === a.room_id)
                  const nights = differenceInDays(new Date(a.check_out_date), new Date(a.check_in_date))
                  const isDone = checkedIn.includes(a.id)
                  return (
                    <tr key={a.id} onClick={() => setSelected(a.id)} style={{ cursor: 'pointer', opacity: isDone ? 0.4 : 1 }}>
                      <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{a.booking_ref}</td>
                      <td>
                        <div className="primary">{a.guest_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.guest_phone}</div>
                      </td>
                      <td>
                        <div className="primary">{room?.number || a.room_id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room?.type_name || ''}</div>
                      </td>
                      <td>{a.check_in_date} → {a.check_out_date}</td>
                      <td>{a.adults}A {a.children > 0 ? `${a.children}C` : ''}</td>
                      <td className="primary">₹{a.total_amount.toLocaleString('en-IN')}</td>
                      <td>
                        {isDone
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 12 }}><CheckCircle size={13} /> Done</span>
                          : <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); handleCheckIn(a.id) }} disabled={processing}>
                              <LogIn size={12} /> Check In
                            </button>
                        }
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No arrivals found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedBooking && selectedRoom && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>Guest Details</div>

              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBooking.guest_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selectedBooking.guest_phone}</div>
                {selectedBooking.guest_email && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selectedBooking.guest_email}</div>}
              </div>

              {[
                ['Booking ID', selectedBooking.booking_ref],
                ['Room', `${selectedRoom.number} · ${selectedRoom.type_name}`],
                ['Check-In', selectedBooking.check_in_date],
                ['Check-Out', selectedBooking.check_out_date],
                ['Duration', `${differenceInDays(new Date(selectedBooking.check_out_date), new Date(selectedBooking.check_in_date))} Nights`],
                ['Guests', `${selectedBooking.adults} Adults${selectedBooking.children ? `, ${selectedBooking.children} Children` : ''}`],
                ['Room Rate', `₹${selectedRoom.rate}/night`],
                ['Total Amount', `₹${selectedBooking.total_amount.toLocaleString('en-IN')}`],
                ['Source', selectedBooking.source],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-success" style={{ flex: 2 }} onClick={() => handleCheckIn(selectedBooking.id)} disabled={processing}>
                  <LogIn size={14} /> {processing ? 'Processing...' : 'Confirm Check-In'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
