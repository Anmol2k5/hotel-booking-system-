import { useState } from 'react'
import { LogIn, Search, CheckCircle } from 'lucide-react'

const arrivals = [
  { id: 'BK-0041', guest: 'Arjun Kapoor', phone: '+91 98765 43210', room: '109', type: 'Deluxe', checkin: '2026-05-06', checkout: '2026-05-09', nights: 3, amount: '₹12,600', adults: 2, children: 0, paid: true },
  { id: 'BK-0042', guest: 'Sanjay Gupta', phone: '+91 87654 32101', room: '211', type: 'Standard', checkin: '2026-05-06', checkout: '2026-05-08', nights: 2, amount: '₹6,800', adults: 1, children: 0, paid: false },
  { id: 'BK-0043', guest: 'Lakshmi Narayan', phone: '+91 76543 21092', room: '305', type: 'Suite', checkin: '2026-05-06', checkout: '2026-05-10', nights: 4, amount: '₹32,000', adults: 2, children: 1, paid: true },
]

export default function CheckIn() {
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const filtered = arrivals.filter(a =>
    a.guest.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search)
  )

  const handleCheckIn = (id: string) => {
    setDone(prev => [...prev, id])
    setSelected(null)
  }

  const selectedBooking = arrivals.find(a => a.id === selected)

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
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} onClick={() => setSelected(a.id)} style={{ cursor: 'pointer', opacity: done.includes(a.id) ? 0.4 : 1 }}>
                  <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{a.id}</td>
                  <td>
                    <div className="primary">{a.guest}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.phone}</div>
                  </td>
                  <td>
                    <div className="primary">{a.room}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.type}</div>
                  </td>
                  <td>{a.checkin} → {a.checkout}</td>
                  <td>{a.adults}A {a.children > 0 ? `${a.children}C` : ''}</td>
                  <td className="primary">{a.amount}</td>
                  <td>
                    <span className={`badge ${a.paid ? 'confirmed' : 'pending'}`}>
                      {a.paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {done.includes(a.id)
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 12 }}><CheckCircle size={13} /> Done</span>
                      : <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); handleCheckIn(a.id) }}>
                          <LogIn size={12} /> Check In
                        </button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedBooking && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700 }}>Guest Details</div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBooking.guest}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selectedBooking.phone}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className={`badge ${selectedBooking.paid ? 'confirmed' : 'pending'}`}>
                  {selectedBooking.paid ? '✓ Payment Cleared' : '⚠ Payment Pending'}
                </span>
              </div>
            </div>

            {[
              ['Booking ID', selectedBooking.id],
              ['Room', `${selectedBooking.room} · ${selectedBooking.type}`],
              ['Check-In', selectedBooking.checkin],
              ['Check-Out', selectedBooking.checkout],
              ['Duration', `${selectedBooking.nights} Nights`],
              ['Guests', `${selectedBooking.adults} Adults${selectedBooking.children ? `, ${selectedBooking.children} Children` : ''}`],
              ['Total Amount', selectedBooking.amount],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-success" style={{ flex: 2 }} onClick={() => handleCheckIn(selectedBooking.id)}>
                <LogIn size={14} /> Confirm Check-In
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
