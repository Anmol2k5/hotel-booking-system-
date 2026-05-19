import { useState, useEffect } from 'react'
import { Wrench } from 'lucide-react'
import type { LocalRoom } from '../global'

const statusLabel: Record<string, string> = {
  available: 'Available', occupied: 'Occupied', checkout: 'Due Out', maintenance: 'Maintenance', reserved: 'Reserved'
}

const tabs = ['All', 'Available', 'Occupied', 'Due Out', 'Maintenance']

export default function Rooms() {
  const [activeTab, setActiveTab] = useState('All')
  const [rooms, setRooms] = useState<LocalRoom[]>([])

  useEffect(() => {
    // Load from local SQLite! Super fast, offline first.
    window.electronAPI.db.getRooms().then(data => {
      setRooms(data)
    })
    
    // Auto refresh every 5 seconds for demo
    const iv = setInterval(() => {
      window.electronAPI.db.getRooms().then(setRooms)
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  const filtered = rooms.filter(r => {
    if (activeTab === 'All') return true
    if (activeTab === 'Available') return r.status === 'available'
    if (activeTab === 'Occupied') return r.status === 'occupied'
    if (activeTab === 'Due Out') return r.status === 'checkout'
    if (activeTab === 'Maintenance') return r.status === 'maintenance'
    return true
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Rooms</div>
          <div className="page-subtitle">{rooms.length} total rooms</div>
        </div>
        <button className="btn btn-secondary btn-sm">
          <Wrench size={13} /> Add Room
        </button>
      </div>

      <div className="filter-tabs" style={{ width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t} className={`filter-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Floor</th>
              <th>Type</th>
              <th>Rate</th>
              <th>Amenities</th>
              <th>Status</th>
              <th>Guest</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.number}>
                <td className="primary font-mono" style={{ fontSize: 16 }}>{r.number}</td>
                <td>{r.floor}F</td>
                <td>{r.type_name}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{r.rate}/night</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>DB Sync</span>
                  </div>
                </td>
                <td><span className={`badge ${r.status}`}>{statusLabel[r.status] || r.status}</span></td>
                <td><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm">View</button>
                    {r.status === 'available' && <button className="btn btn-primary btn-sm">Book</button>}
                    {r.status === 'maintenance' && <button className="btn btn-secondary btn-sm">Resolve</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
