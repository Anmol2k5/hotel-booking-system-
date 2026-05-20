import { Search, Plus, Phone, Mail, X, UserPlus, Edit2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { LocalGuest } from '../global'
import { v4 as uuidv4 } from 'uuid'

export default function Guests() {
  const [search, setSearch] = useState('')
  const [guests, setGuests] = useState<LocalGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState<LocalGuest | null>(null)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    idType: '', idNumber: '', address: '', city: '', country: 'IN', vip: false
  })

  const loadData = async () => {
    try {
      const g = await window.electronAPI.db.getGuests()
      setGuests(g)
    } catch (e) {
      console.error('Failed to load guests:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = guests.filter(g => {
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase()
    return fullName.includes(search.toLowerCase()) ||
      g.phone.includes(search) ||
      (g.email && g.email.toLowerCase().includes(search.toLowerCase()))
  })

  const openNewGuest = () => {
    setEditingGuest(null)
    setFormData({ firstName: '', lastName: '', phone: '', email: '', idType: '', idNumber: '', address: '', city: '', country: 'IN', vip: false })
    setShowModal(true)
  }

  const openEditGuest = (g: LocalGuest) => {
    setEditingGuest(g)
    setFormData({
      firstName: g.first_name, lastName: g.last_name, phone: g.phone, email: g.email || '',
      idType: g.id_type || '', idNumber: g.id_number || '', address: g.address || '',
      city: g.city || '', country: g.country || 'IN', vip: !!g.vip
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) return

    if (editingGuest) {
      await window.electronAPI.db.updateGuest(editingGuest.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        id_type: formData.idType,
        id_number: formData.idNumber,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        vip: formData.vip ? 1 : 0
      })
    } else {
      const guest: LocalGuest = {
        id: uuidv4(),
        property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        id_type: formData.idType,
        id_number: formData.idNumber,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        vip: formData.vip ? 1 : 0,
        total_stays: 0,
        total_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      await window.electronAPI.db.createGuest(guest)
    }

    setShowModal(false)
    await loadData()
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

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
          <button className="btn btn-primary btn-sm" onClick={openNewGuest}>
            <Plus size={14} /> Add Guest
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading guests...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.length > 0 ? filtered.map(g => (
            <div key={g.id} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${g.vip ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius)',
              padding: 18,
              transition: 'all 0.2s',
              cursor: 'pointer',
              position: 'relative'
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <button
                onClick={(e) => { e.stopPropagation(); openEditGuest(g) }}
                style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <Edit2 size={14} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: g.vip ? 'var(--warning-subtle)' : 'var(--accent-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: g.vip ? 'var(--warning)' : 'var(--accent)',
                    fontWeight: 700, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    {g.first_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.first_name} {g.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.city || 'N/A'}</div>
                  </div>
                </div>
                {g.vip && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--warning-subtle)', color: 'var(--warning)' }}>VIP</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <Phone size={11} /> {g.phone}
                </div>
                {g.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <Mail size={11} /> {g.email}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{g.total_stays || 0} stays</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(g.total_spent || 0)}</span>
              </div>
            </div>
          )) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <UserPlus size={32} />
              <p>No guests found</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingGuest ? 'Edit Guest' : 'Add New Guest'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">ID Type</label>
                <select className="form-select" value={formData.idType} onChange={e => setFormData({ ...formData, idType: e.target.value })}>
                  <option value="">Select</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="PAN">PAN</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input className="form-input" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Address</label>
              <input className="form-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.vip} onChange={e => setFormData({ ...formData, vip: e.target.checked })} />
              <span style={{ fontSize: 13 }}>VIP Guest</span>
            </label>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!formData.firstName || !formData.lastName || !formData.phone}>
                {editingGuest ? 'Save Changes' : 'Add Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
