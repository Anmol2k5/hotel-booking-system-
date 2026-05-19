import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'

const bookings = [
  { id: 'BK-0041', guest: 'Arjun Kapoor', phone: '+91 98765 43210', room: '109', type: 'Deluxe', checkin: '2026-05-06', checkout: '2026-05-09', nights: 3, amount: '₹12,600', status: 'confirmed', source: 'Direct' },
  { id: 'BK-0040', guest: 'Meena Joshi', phone: '+91 87654 32109', room: '204', type: 'Suite', checkin: '2026-05-05', checkout: '2026-05-07', nights: 2, amount: '₹18,400', status: 'checkedin', source: 'MakeMyTrip' },
  { id: 'BK-0039', guest: 'Rahul Verma', phone: '+91 76543 21098', room: '103', type: 'Standard', checkin: '2026-05-04', checkout: '2026-05-06', nights: 2, amount: '₹6,800', status: 'checkedout', source: 'Booking.com' },
  { id: 'BK-0038', guest: 'Anita Shah', phone: '+91 65432 10987', room: '302', type: 'Deluxe', checkin: '2026-05-06', checkout: '2026-05-08', nights: 2, amount: '₹9,200', status: 'pending', source: 'Walk-in' },
  { id: 'BK-0037', guest: 'Suresh Nair', phone: '+91 54321 09876', room: '201', type: 'Suite', checkin: '2026-05-03', checkout: '2026-05-06', nights: 3, amount: '₹24,600', status: 'confirmed', source: 'Airbnb' },
  { id: 'BK-0036', guest: 'Kavita Reddy', phone: '+91 43210 98765', room: '115', type: 'Standard', checkin: '2026-05-07', checkout: '2026-05-10', nights: 3, amount: '₹10,200', status: 'confirmed', source: 'Direct' },
  { id: 'BK-0035', guest: 'Mohan Das', phone: '+91 32109 87654', room: '310', type: 'Deluxe', checkin: '2026-05-02', checkout: '2026-05-05', nights: 3, amount: '₹14,100', status: 'checkedout', source: 'MakeMyTrip' },
  { id: 'BK-0034', guest: 'Preethi Kumar', phone: '+91 21098 76543', room: '207', type: 'Suite', checkin: '2026-05-08', checkout: '2026-05-12', nights: 4, amount: '₹36,000', status: 'confirmed', source: 'Direct' },
]

const tabs = ['All', 'Confirmed', 'Checked In', 'Checked Out', 'Pending', 'Cancelled']

export default function Bookings() {
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = bookings.filter(b => {
    const matchTab = activeTab === 'All' ||
      (activeTab === 'Confirmed' && b.status === 'confirmed') ||
      (activeTab === 'Checked In' && b.status === 'checkedin') ||
      (activeTab === 'Checked Out' && b.status === 'checkedout') ||
      (activeTab === 'Pending' && b.status === 'pending')
    const matchSearch = b.guest.toLowerCase().includes(search.toLowerCase()) ||
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
        <button className="btn btn-primary">
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
              <th>Nights</th>
              <th>Amount</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{b.id}</td>
                <td>
                  <div className="primary">{b.guest}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.phone}</div>
                </td>
                <td>
                  <div className="primary">{b.room}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.type}</div>
                </td>
                <td>{b.checkin}</td>
                <td>{b.checkout}</td>
                <td>{b.nights}N</td>
                <td className="primary">{b.amount}</td>
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
                    <button className="btn btn-ghost btn-sm">View</button>
                    <button className="btn btn-secondary btn-sm">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Search size={32} />
            <p>No bookings found</p>
          </div>
        )}
      </div>
    </>
  )
}
