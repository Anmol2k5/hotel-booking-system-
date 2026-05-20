import { useState, useEffect } from 'react'
import { Wrench, X, Plus } from 'lucide-react'
import type { LocalRoom } from '../global'
import { v4 as uuidv4 } from 'uuid'

const statusLabel: Record<string, string> = {
  available: 'Available', occupied: 'Occupied', checkout: 'Due Out', maintenance: 'Maintenance', reserved: 'Reserved'
}

const tabs = ['All', 'Available', 'Occupied', 'Due Out', 'Maintenance', 'Reserved']

export default function Rooms() {
  const [activeTab, setActiveTab] = useState('All')
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [newRoom, setNewRoom] = useState({ number: '', floor: 1, type_name: 'Standard', rate: 1000 })

  const loadData = async () => {
    try {
      const data = await window.electronAPI.db.getRooms()
      setRooms(data)
    } catch (e) {
      console.error('Failed to load rooms:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const iv = setInterval(loadData, 10000)
    return () => clearInterval(iv)
  }, [])

  const filtered = rooms.filter(r => {
    if (activeTab === 'All') return true
    if (activeTab === 'Available') return r.status === 'available'
    if (activeTab === 'Occupied') return r.status === 'occupied'
    if (activeTab === 'Due Out') return r.status === 'checkout'
    if (activeTab === 'Maintenance') return r.status === 'maintenance'
    if (activeTab === 'Reserved') return r.status === 'reserved'
    return true
  })

  const handleStatusChange = async (roomId: string) => {
    if (!newStatus) return
    await window.electronAPI.db.updateRoomStatus(roomId, newStatus, statusReason)
    setShowStatusModal(null)
    setNewStatus('')
    setStatusReason('')
    await loadData()
  }

  const handleAddRoom = async () => {
    if (!newRoom.number) return
    const room: LocalRoom = {
      id: uuidv4(),
      property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      room_type_id: '',
      number: newRoom.number,
      floor: newRoom.floor,
      status: 'available',
      type_name: newRoom.type_name,
      rate: newRoom.rate,
      amenities: '',
      updated_at: new Date().toISOString()
    }
    await window.electronAPI.db.addRoom(room)
    setShowModal(false)
    setNewRoom({ number: '', floor: 1, type_name: 'Standard', rate: 1000 })
    await loadData()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Rooms</div>
          <div className="page-subtitle">{rooms.length} total rooms</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={13} /> Add Room
        </button>
      </div>

      <div className="filter-tabs" style={{ width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t} className={`filter-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading rooms...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Floor</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(r => (
                <tr key={r.id}>
                  <td className="primary font-mono" style={{ fontSize: 16 }}>{r.number}</td>
                  <td>{r.floor}F</td>
                  <td>{r.type_name}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{r.rate}/night</td>
                  <td><span className={`badge ${r.status === 'available' ? 'confirmed' : r.status === 'occupied' ? 'checkedin' : r.status === 'checkout' ? 'pending' : r.status === 'maintenance' ? 'cancelled' : 'checkedin'}`}>{statusLabel[r.status] || r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.status === 'available' && <button className="btn btn-primary btn-sm" onClick={() => { window.location.hash = '/bookings' }}>Book</button>}
                      <button className="btn btn-secondary btn-sm" onClick={() => { setShowStatusModal(r.id); setNewStatus('') }}>
                        <Wrench size={12} /> Status
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No rooms in this category</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Change Room Status</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStatusModal(null)}><X size={18} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="">Select status</option>
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
                <option value="checkout">Due Out</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Reason</label>
              <input className="form-input" value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Optional reason..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleStatusChange(showStatusModal)} disabled={!newStatus}>Update Status</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Add New Room</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Room Number *</label>
                <input className="form-input" value={newRoom.number} onChange={e => setNewRoom({ ...newRoom, number: e.target.value })} placeholder="e.g. 301" />
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input className="form-input" type="number" min={1} max={20} value={newRoom.floor} onChange={e => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select className="form-select" value={newRoom.type_name} onChange={e => setNewRoom({ ...newRoom, type_name: e.target.value })}>
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rate per Night (₹)</label>
                <input className="form-input" type="number" min={1} value={newRoom.rate} onChange={e => setNewRoom({ ...newRoom, rate: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddRoom} disabled={!newRoom.number}>Add Room</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
