import { LogOut, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import Receipt from '../components/Receipt'

const departures = [
  { id: 'BK-0039', guest: 'Priya Sharma', room: '103', type: 'Suite', checkin: '2026-05-03', checkout: '2026-05-06', nights: 3, roomCharge: '₹24,600', extras: '₹1,200', total: '₹25,800', settled: true },
  { id: 'BK-0035', guest: 'Ravi Mehta', room: '205', type: 'Deluxe', checkin: '2026-05-04', checkout: '2026-05-06', nights: 2, roomCharge: '₹8,400', extras: '₹650', total: '₹9,050', settled: false },
]

export default function CheckOut() {
  const [done, setDone] = useState<string[]>([])
  const [printData, setPrintData] = useState<any>(null)

  useEffect(() => {
    if (printData) {
      window.print()
      // Optional: Clear printData after printing, though leaving it is fine as it's hidden by CSS
    }
  }, [printData])

  const handlePrint = (d: any) => {
    setPrintData(d)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Check Out</div>
          <div className="page-subtitle">{departures.length} departures today</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {departures.map(d => (
          <div key={d.id} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${done.includes(d.id) ? 'var(--success)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius)',
            padding: 20,
            opacity: done.includes(d.id) ? 0.6 : 1,
            transition: 'all 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{d.guest}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  {d.id} · Room {d.room} ({d.type})
                </div>
              </div>
              {done.includes(d.id)
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={16} /> Checked Out</span>
                : <span className={`badge ${d.settled ? 'confirmed' : 'pending'}`}>{d.settled ? 'Bill Settled' : 'Bill Pending'}</span>
              }
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
              {[
                ['Check-In', d.checkin],
                ['Check-Out', d.checkout],
                ['Duration', `${d.nights} Nights`],
                ['Room Charges', d.roomCharge],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Room: <b style={{ color: 'var(--text-primary)' }}>{d.roomCharge}</b></span>
                <span style={{ color: 'var(--text-muted)' }}>Extras: <b style={{ color: 'var(--text-primary)' }}>{d.extras}</b></span>
                <span style={{ color: 'var(--text-muted)' }}>Total: <b style={{ color: 'var(--success)', fontSize: 16 }}>{d.total}</b></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(d)}>Print Bill</button>
                {!done.includes(d.id) && (
                  <button className="btn btn-primary btn-sm" onClick={() => setDone(p => [...p, d.id])}>
                    <LogOut size={13} /> Process Check-Out
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Invisible until printed */}
      <Receipt data={printData} />
    </>
  )
}
