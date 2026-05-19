import React from 'react'

interface ReceiptProps {
  data: {
    id: string
    guest: string
    room: string
    type: string
    checkin: string
    checkout: string
    nights: number
    roomCharge: string
    extras: string
    total: string
  } | null
}

export default function Receipt({ data }: ReceiptProps) {
  if (!data) return null

  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  // Strip non-numeric characters for calculation
  const getAmount = (str: string) => parseInt(str.replace(/[^\d]/g, ''), 10)
  
  const roomTotal = getAmount(data.roomCharge)
  const extrasTotal = getAmount(data.extras)
  const subtotal = roomTotal + extrasTotal
  // Assuming total includes 12% GST, calculate base and tax
  const tax = subtotal - Math.round(subtotal / 1.12)
  const base = subtotal - tax

  return (
    <div className="printable-receipt">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontFamily: "'Space Grotesk', sans-serif" }}>StayDesk Hotel</h1>
        <p style={{ margin: '5px 0', color: '#666' }}>14 Ridge Road, Shimla Hills, Himachal Pradesh</p>
        <p style={{ margin: '0', color: '#666' }}>Phone: +91 98765 43210 | GSTIN: 02XXXXX1234X1ZX</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '2px solid #eee', paddingBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>INVOICE TO</h3>
          <p style={{ margin: '0 0 5px 0', fontSize: 18, fontWeight: 'bold' }}>{data.guest}</p>
          <p style={{ margin: 0, color: '#666' }}>Booking Ref: {data.id}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>INVOICE DETAILS</h3>
          <p style={{ margin: '0 0 5px 0' }}><strong>Invoice No:</strong> INV-{Math.floor(Math.random() * 10000)}</p>
          <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {issueDate}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <div><strong>Room:</strong> {data.room} ({data.type})</div>
        <div><strong>Check-in:</strong> {data.checkin}</div>
        <div><strong>Check-out:</strong> {data.checkout}</div>
        <div><strong>Duration:</strong> {data.nights} Nights</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: 12, textAlign: 'left' }}>Description</th>
            <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: 12 }}>Room Charges ({data.nights} nights)</td>
            <td style={{ padding: 12, textAlign: 'right' }}>₹{roomTotal.toLocaleString()}</td>
          </tr>
          {extrasTotal > 0 && (
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 12 }}>Additional Services / Extras</td>
              <td style={{ padding: 12, textAlign: 'right' }}>₹{extrasTotal.toLocaleString()}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ width: '50%', marginLeft: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
          <span style={{ color: '#666' }}>Subtotal</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '2px solid #ddd' }}>
          <span style={{ color: '#666' }}>GST (12%)</span>
          <span>₹{tax.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontSize: 20, fontWeight: 'bold' }}>
          <span>Total Amount</span>
          <span>{data.total}</span>
        </div>
      </div>

      <div style={{ marginTop: 60, textAlign: 'center', color: '#666', fontSize: 14 }}>
        <p>Thank you for choosing StayDesk Hotel. We hope to see you again!</p>
        <p style={{ marginTop: 20, fontSize: 12 }}>This is a computer generated invoice and does not require a signature.</p>
      </div>
    </div>
  )
}
