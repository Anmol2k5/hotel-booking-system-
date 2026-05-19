import { Search, Plus, Phone, Mail } from 'lucide-react'
import { useState } from 'react'

const guests = [
  { id: 'G-001', name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@email.com', city: 'Mumbai', stays: 4, lastStay: '2026-05-06', spent: '₹42,600', vip: true },
  { id: 'G-002', name: 'Priya Sharma', phone: '+91 87654 32109', email: 'priya@email.com', city: 'Delhi', stays: 2, lastStay: '2026-05-06', spent: '₹25,800', vip: false },
  { id: 'G-003', name: 'Amit Singh', phone: '+91 76543 21098', email: 'amit@email.com', city: 'Pune', stays: 7, lastStay: '2026-05-05', spent: '₹78,400', vip: true },
  { id: 'G-004', name: 'Neha Patel', phone: '+91 65432 10987', email: 'neha@email.com', city: 'Bangalore', stays: 1, lastStay: '2026-05-04', spent: '₹9,200', vip: false },
  { id: 'G-005', name: 'Vikram Rao', phone: '+91 54321 09876', email: 'vikram@email.com', city: 'Chennai', stays: 3, lastStay: '2026-05-03', spent: '₹34,100', vip: false },
]

export default function Guests() {
  const [search, setSearch] = useState('')

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Guests</div>
          <div className="page-subtitle">{guests.length} registered guests</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <Search size={14} />
            <input placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Guest
          </button>
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
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{g.spent}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
