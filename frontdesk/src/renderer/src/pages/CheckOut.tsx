import { LogOut, CheckCircle, Plus, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import Receipt from '../components/Receipt'
import type { LocalBooking, LocalRoom, BookingExtra, Payment } from '../global'
import { v4 as uuidv4 } from 'uuid'
import { differenceInDays } from 'date-fns'

export default function CheckOut() {
  const [done, setDone] = useState<string[]>([])
  const [printData, setPrintData] = useState<any>(null)
  const [departures, setDepartures] = useState<LocalBooking[]>([])
  const [rooms, setRooms] = useState<LocalRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showExtras, setShowExtras] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState<string | null>(null)
  const [extras, setExtras] = useState<BookingExtra[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [newExtra, setNewExtra] = useState({ description: '', amount: '' })
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', reference: '' })

  const loadData = async () => {
    try {
      const [checkOuts, r] = await Promise.all([
        window.electronAPI.db.getTodayCheckOuts(),
        window.electronAPI.db.getRooms()
      ])
      setDepartures(checkOuts)
      setRooms(r)
    } catch (e) {
      console.error('Failed to load check-outs:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (printData) {
      window.print()
    }
  }, [printData])

  const loadBookingExtras = async (bookingId: string) => {
    const [ex, pay] = await Promise.all([
      window.electronAPI.db.getBookingExtras(bookingId),
      window.electronAPI.db.getBookingPayments(bookingId)
    ])
    setExtras(ex)
    setPayments(pay)
  }

  const handleAddExtra = async (bookingId: string) => {
    if (!newExtra.description || !newExtra.amount) return
    const extra: BookingExtra = {
      id: uuidv4(),
      booking_id: bookingId,
      description: newExtra.description,
      amount: parseFloat(newExtra.amount),
      created_at: new Date().toISOString()
    }
    await window.electronAPI.db.addBookingExtra(extra)
    setNewExtra({ description: '', amount: '' })
    await loadBookingExtras(bookingId)
    await loadData()
  }

  const handleAddPayment = async (bookingId: string, totalAmount: number) => {
    if (!newPayment.amount) return
    const payment: Payment = {
      id: uuidv4(),
      booking_id: bookingId,
      amount: parseFloat(newPayment.amount),
      method: newPayment.method,
      status: 'completed',
      reference: newPayment.reference,
      created_at: new Date().toISOString()
    }
    await window.electronAPI.db.addPayment(payment)
    setNewPayment({ amount: '', method: 'Cash', reference: '' })
    await loadBookingExtras(bookingId)
  }

  const handleCheckOut = async (booking: LocalBooking) => {
    setProcessing(true)
    try {
      await window.electronAPI.db.updateBooking(booking.id, { status: 'checkedout' })
      await window.electronAPI.db.updateRoomStatus(booking.room_id, 'checkout', `Guest checked out: ${booking.guest_name}`)
      setDone(prev => [...prev, booking.id])
      setShowExtras(null)
      setShowPayment(null)
      await loadData()
    } catch (e) {
      console.error('Check-out failed:', e)
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = (d: any) => {
    setPrintData(d)
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Check Out</div>
          <div className="page-subtitle">{departures.length} departures today</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading departures...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {departures.length > 0 ? departures.map(d => {
            const room = rooms.find(r => r.id === d.room_id)
            const nights = differenceInDays(new Date(d.check_out_date), new Date(d.check_in_date))
            const isDone = done.includes(d.id)
            const roomCharge = (d.base_amount || d.total_amount) - (d.tax_amount || 0) - (d.extras_amount || 0)
            const total = d.total_amount

            return (
              <div key={d.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isDone ? 'var(--success)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius)',
                padding: 20,
                opacity: isDone ? 0.6 : 1,
                transition: 'all 0.3s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{d.guest_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      {d.booking_ref} · Room {room?.number} ({room?.type_name})
                    </div>
                  </div>
                  {isDone
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={16} /> Checked Out</span>
                    : <span className="badge pending">Bill Pending</span>
                  }
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
                  {[
                    ['Check-In', d.check_in_date],
                    ['Check-Out', d.check_out_date],
                    ['Duration', `${nights} Nights`],
                    ['Room Charges', formatCurrency(roomCharge)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Room: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(roomCharge)}</b></span>
                    <span style={{ color: 'var(--text-muted)' }}>Extras: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.extras_amount || 0)}</b></span>
                    <span style={{ color: 'var(--text-muted)' }}>Tax: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(d.tax_amount || 0)}</b></span>
                    <span style={{ color: 'var(--text-muted)' }}>Total: <b style={{ color: 'var(--success)', fontSize: 16 }}>{formatCurrency(total)}</b></span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isDone && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setShowExtras(showExtras === d.id ? null : d.id); loadBookingExtras(d.id) }}>
                          <Plus size={12} /> Extras
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setShowPayment(showPayment === d.id ? null : d.id); loadBookingExtras(d.id) }}>
                          Payment
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePrint({
                          id: d.booking_ref, guest: d.guest_name, room: room?.number, type: room?.type_name,
                          checkin: d.check_in_date, checkout: d.check_out_date, nights,
                          roomCharge: formatCurrency(roomCharge), extras: formatCurrency(d.extras_amount || 0),
                          total: formatCurrency(total)
                        })}>Print Bill</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleCheckOut(d)} disabled={processing}>
                          <LogOut size={13} /> {processing ? 'Processing...' : 'Process Check-Out'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Extras Panel */}
                {showExtras === d.id && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Booking Extras</div>
                    {extras.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {extras.map(ex => (
                          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                            <span>{ex.description}</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(ex.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" placeholder="Description" value={newExtra.description} onChange={e => setNewExtra({ ...newExtra, description: e.target.value })} style={{ flex: 2 }} />
                      <input className="form-input" type="number" placeholder="Amount" value={newExtra.amount} onChange={e => setNewExtra({ ...newExtra, amount: e.target.value })} style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddExtra(d.id)}>Add</button>
                    </div>
                  </div>
                )}

                {/* Payment Panel */}
                {showPayment === d.id && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Record Payment</div>
                    {payments.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {payments.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                            <span>{p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" type="number" placeholder="Amount" value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })} style={{ flex: 1 }} />
                      <select className="form-select" value={newPayment.method} onChange={e => setNewPayment({ ...newPayment, method: e.target.value })} style={{ flex: 1 }}>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                      <input className="form-input" placeholder="Reference" value={newPayment.reference} onChange={e => setNewPayment({ ...newPayment, reference: e.target.value })} style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddPayment(d.id, d.total_amount)}>Record</button>
                    </div>
                  </div>
                )}
              </div>
            )
          }) : (
            <div className="empty-state">
              <LogOut size={32} />
              <p>No departures today</p>
            </div>
          )}
        </div>
      )}

      <Receipt data={printData} />
    </>
  )
}
