import { LogOut, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { LocalBooking, LocalRoom } from '../global'
import Receipt from '../components/Receipt'

export default function CheckOut() {
  const [done, setDone] = useState<string[]>([])
  const [printData, setPrintData] = useState<any>(null)
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

  useEffect(() => {
    if (printData) {
      window.print()
    }
  }, [printData])

  // Filter bookings that are 'checkedin' (ready to check out)
  const departures = bookings.filter(b => b.status === 'checkedin')

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

  const handleProcessCheckout = async (bookingId: string, roomId: string) => {
    try {
      // 1. Update booking status to 'checkedout'
      await window.electronAPI.db.updateBookingStatus(bookingId, 'checkedout')
      // 2. Update room status to 'checkout' (due out / needs cleaning)
      await window.electronAPI.db.updateRoomStatus(roomId, 'checkout')
      
      setDone(prev => [...prev, bookingId])
      loadData()
    } catch (err) {
      console.error('Failed to checkout:', err)
      alert('Error saving checkout offline')
    }
  }

  const handlePrint = (b: LocalBooking) => {
    const nights = getStayNights(b.check_in_date, b.check_out_date)
    const roomCharge = b.room_rate * nights
    const extras = 0 // default for simple billing
    const total = roomCharge + extras

    const formattedData = {
      id: b.id,
      guest: b.guest_name,
      room: getRoomNumber(b.room_id),
      type: getRoomType(b.room_id),
      checkin: b.check_in_date,
      checkout: b.check_out_date,
      nights: nights,
      roomCharge: `₹${roomCharge.toLocaleString('en-IN')}`,
      extras: `₹${extras.toLocaleString('en-IN')}`,
      total: `₹${total.toLocaleString('en-IN')}`,
      settled: true
    }
    setPrintData(formattedData)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Check Out</div>
          <div className="page-subtitle">{departures.length} checked-in guests</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {departures.map(d => {
          const nights = getStayNights(d.check_in_date, d.check_out_date)
          const roomCharge = d.room_rate * nights
          const extras = 0
          const total = roomCharge + extras
          const isFinished = done.includes(d.id) || d.status === 'checkedout'

          return (
            <div key={d.id} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${isFinished ? 'var(--success)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius)',
              padding: 20,
              opacity: isFinished ? 0.6 : 1,
              transition: 'all 0.3s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{d.guest_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {d.id} · Room {getRoomNumber(d.room_id)} ({getRoomType(d.room_id)})
                  </div>
                </div>
                {isFinished
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={16} /> Checked Out</span>
                  : <span className="badge pending">Bill Unsettled</span>
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
                {[
                  ['Check-In', d.check_in_date],
                  ['Check-Out', d.check_out_date],
                  ['Duration', `${nights} Nights`],
                  ['Room Charges', `₹${roomCharge.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Room: <b style={{ color: 'var(--text-primary)' }}>₹{roomCharge.toLocaleString('en-IN')}</b></span>
                  <span style={{ color: 'var(--text-muted)' }}>Extras: <b style={{ color: 'var(--text-primary)' }}>₹{extras.toLocaleString('en-IN')}</b></span>
                  <span style={{ color: 'var(--text-muted)' }}>Total: <b style={{ color: 'var(--success)', fontSize: 16 }}>₹{total.toLocaleString('en-IN')}</b></span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(d)}>Print Bill</button>
                  {!isFinished && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleProcessCheckout(d.id, d.room_id)}>
                      <LogOut size={13} /> Process Check-Out
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {departures.length === 0 && (
          <div className="empty-state">
            <LogOut size={32} />
            <p>No checked-in guests found</p>
          </div>
        )}
      </div>
      
      {/* Invisible until printed */}
      <Receipt data={printData} />
    </>
  )
}
