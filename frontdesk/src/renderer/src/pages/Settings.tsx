import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Wifi, WifiOff, Database, RefreshCw } from 'lucide-react'
import type { AppSettings } from '../global'
import { SyncEngine } from '../lib/syncEngine'

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [syncStatus, setSyncStatus] = useState({ online: true, syncCount: 0, queueSize: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadData = async () => {
    const s = await window.electronAPI.db.getSettings()
    setSettings(s)
    const status = SyncEngine.getStatus()
    const queue = await window.electronAPI.db.getSyncQueue()
    setSyncStatus({ online: status.online, syncCount: status.syncCount, queueSize: queue.length })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (key: string, value: string) => {
    setSaving(true)
    await window.electronAPI.db.updateSetting(key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const handleSyncNow = async () => {
    await SyncEngine.pushPendingChanges()
    await SyncEngine.pullInitialData()
    await loadData()
  }

  if (!settings) return <div style={{ padding: 48, color: 'var(--text-muted)' }}>Loading settings...</div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure your property and system</div>
        </div>
        {saved && <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>Saved!</span>}
      </div>

      {/* Sync Status */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {syncStatus.online ? <Wifi size={18} color="var(--success)" /> : <WifiOff size={18} color="var(--danger)" />}
            <div>
              <div style={{ fontWeight: 600 }}>Sync Status</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {syncStatus.online ? 'Online' : 'Offline'} · {syncStatus.syncCount} syncs · {syncStatus.queueSize} pending
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleSyncNow}>
            <RefreshCw size={13} /> Sync Now
          </button>
        </div>
      </div>

      {/* Property Settings */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <SettingsIcon size={18} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Property Information</div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Property Name</label>
            <input className="form-input" value={settings.property_name} onChange={e => setSettings({ ...settings, property_name: e.target.value })} onBlur={e => handleSave('property_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={settings.property_phone} onChange={e => setSettings({ ...settings, property_phone: e.target.value })} onBlur={e => handleSave('property_phone', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={settings.property_address} onChange={e => setSettings({ ...settings, property_address: e.target.value })} onBlur={e => handleSave('property_address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">GSTIN</label>
            <input className="form-input" value={settings.property_gstin} onChange={e => setSettings({ ...settings, property_gstin: e.target.value })} onBlur={e => handleSave('property_gstin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">GST Rate (%)</label>
            <input className="form-input" type="number" value={settings.gst_rate} onChange={e => setSettings({ ...settings, gst_rate: e.target.value })} onBlur={e => handleSave('gst_rate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Booking Settings */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Database size={18} />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Booking Defaults</div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Check-In Time</label>
            <input className="form-input" type="time" value={settings.check_in_time} onChange={e => setSettings({ ...settings, check_in_time: e.target.value })} onBlur={e => handleSave('check_in_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Check-Out Time</label>
            <input className="form-input" type="time" value={settings.check_out_time} onChange={e => setSettings({ ...settings, check_out_time: e.target.value })} onBlur={e => handleSave('check_out_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Currency Symbol</label>
            <input className="form-input" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} onBlur={e => handleSave('currency', e.target.value)} />
          </div>
        </div>
      </div>

      {/* System Info */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>System Information</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>App Version</span>
            <span>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database</span>
            <span>SQLite (better-sqlite3)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cloud Sync</span>
            <span>Supabase</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Device ID</span>
            <span style={{ fontFamily: 'monospace' }}>{import.meta.env.VITE_DEVICE_ID || 'N/A'}</span>
          </div>
        </div>
      </div>
    </>
  )
}
