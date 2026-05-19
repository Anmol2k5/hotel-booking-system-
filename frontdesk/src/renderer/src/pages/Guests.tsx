import { Search, Plus, Phone, Mail, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { LocalBooking } from '../global'

interface GuestSummary {
  id: string
  name: string
  phone: string
  email: string
  city: string
  stays: number
  lastStay: string
  spent: number
  vip: boolean
}

export default function Guests() {
  const [search, setSearch] = useState('')
  const [bookings, setBookings] = useState<LocalBooking[]>([])
  const [guestsList, setGuestsList] = useState<GuestSummary[]>([])

  useEffect(() => {
    window.electronAPI.db.getBookings().then(setBookings)
    const interval = setInterval(() => {
      window.electronAPI.db.getBookings().then(setBookings)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Group bookings by guest_name and guest_phone
    const guestMap: Record<string, GuestSummary> = {}

    bookings.forEach(b => {
      const key = `${b.guest_name.trim().toLowerCase()}-${b.guest_phone.trim()}`
      
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
      const bookingCost = b.room_rate * nights

      if (!guestMap[key]) {
        guestMap[key] = {
          id: b.guest_id || `G-${Math.floor(1000 + Math.random() * 9000)}`,
          name: b.guest_name,
          phone: b.guest_phone,
          email: `${b.guest_name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          city: 'In-house Guest',
          stays: 0,
          lastStay: b.check_in_date,
          spent: 0,
          vip: false
        }
      }

      const g = guestMap[key]
      g.stays += 1
      g.spent += bookingCost
      if (new Date(b.check_in_date) > new Date(g.lastStay)) {
        g.lastStay = b.check_in_date
      }
      // If they stayed more than 3 times or spent more than 30,000, mark as VIP
      if (g.stays >= 3 || g.spent >= 30000) {
        g.vip = true
      }
    })

    setGuestsList(Object.values(guestMap))
  }, [bookings])

  const filtered = guestsList.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Guests</div>
          <div className="page-subtitle">{guestsList.length} registered guests</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <Search size={14} />
            <input placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(g => (
          <div key={g.id} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${g.vip ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius)',
            padding: 18,
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: g.vip ? 'var(--warning-subtle)' : 'var(--accent-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: g.vip ? 'var(--warning)' : 'var(--accent)',
                  fontWeight: 700, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif"
                }}>
                  {g.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.city}</div>
                </div>
              </div>
              {g.vip && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--warning-subtle)', color: 'var(--warning)' }}>⭐ VIP</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <Phone size={11} /> {g.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <Mail size={11} /> {g.email}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{g.stays} stays · Last: {g.lastStay}</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{g.spent.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <User size={32} />
            <p>No guests found</p>
          </div>
        )}
      </div>
    </>
  )
}
