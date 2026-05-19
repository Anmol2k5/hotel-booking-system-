import { supabase, PROPERTY_ID, DEVICE_ID } from './supabase'

// Helper functions to map local frontend values to remote Supabase constraint values
const mapSource = (src: string): string => {
  const s = src.toLowerCase().trim()
  if (s === 'direct') return 'direct'
  if (s === 'walk-in' || s === 'walk_in') return 'walk_in'
  if (s === 'booking.com' || s === 'booking_com') return 'booking_com'
  if (s === 'makemytrip') return 'makemytrip'
  if (s === 'airbnb') return 'airbnb'
  return 'other'
}

const mapStatus = (st: string): string => {
  const s = st.toLowerCase().trim()
  if (s === 'confirmed') return 'confirmed'
  if (s === 'checkedin' || s === 'checked_in') return 'checked_in'
  if (s === 'checkedout' || s === 'checked_out') return 'checked_out'
  if (s === 'cancelled') return 'cancelled'
  return 'confirmed'
}

const mapRoomStatus = (st: string): string => {
  const s = st.toLowerCase().trim()
  if (s === 'available') return 'available'
  if (s === 'occupied') return 'occupied'
  if (s === 'maintenance') return 'maintenance'
  if (s === 'blocked') return 'blocked'
  if (s === 'reserved') return 'available'
  if (s === 'checkout') return 'available'
  return 'available'
}

export class SyncEngine {
  // 1. Pull data from server into local SQLite
  static async pullInitialData() {
    try {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*, room_types(name, base_rate)')
        .eq('property_id', PROPERTY_ID)
        
      if (rooms) {
        const mappedRooms = rooms.map(r => ({
          id: r.id,
          property_id: r.property_id,
          room_type_id: r.room_type_id,
          number: r.number,
          floor: r.floor,
          status: r.status,
          type_name: r.room_types.name,
          rate: r.room_types.base_rate
        }))
        await window.electronAPI.db.upsertRooms(mappedRooms)
        console.log(`[Sync] Pulled ${mappedRooms.length} rooms.`)
      }
    } catch (e) {
      console.error('[Sync] Error pulling initial data:', e)
    }
  }

  // 2. Push offline actions to server
  static async pushPendingChanges() {
    try {
      const queue = await window.electronAPI.db.getSyncQueue()
      if (queue.length === 0) return

      console.log(`[Sync] Processing ${queue.length} pending items...`)
      
      for (const item of queue) {
        if (item.action === 'INSERT' && item.table_name === 'bookings') {
          const booking = JSON.parse(item.payload)
          
          // Push to booking_intents table for conflict resolution
          const { error } = await supabase
            .from('booking_intents')
            .insert({
              local_id: booking.id,
              property_id: booking.property_id,
              room_id: booking.room_id,
              guest_data: { name: booking.guest_name, phone: booking.guest_phone },
              check_in_date: booking.check_in_date,
              check_out_date: booking.check_out_date,
              adults: booking.adults,
              children: booking.children,
              room_rate: booking.room_rate,
              source: mapSource(booking.source),
              status: mapStatus(booking.status),
              created_offline_at: booking.created_at,
              device_id: DEVICE_ID
            })

          if (error) {
            console.error('[Sync] Failed to push intent:', error)
          } else {
            await window.electronAPI.db.clearSyncQueueItem(item.id)
            console.log(`[Sync] Successfully pushed intent for local booking ${booking.id}`)
          }
        } else if (item.action === 'UPDATE' && item.table_name === 'bookings') {
          const payload = JSON.parse(item.payload)
          // Try to update the status in booking_intents and bookings
          const { error: intentErr } = await supabase
            .from('booking_intents')
            .update({ status: mapStatus(payload.status) })
            .eq('local_id', item.record_id)

          const { error: bookingErr } = await supabase
            .from('bookings')
            .update({ status: mapStatus(payload.status) })
            .eq('id', item.record_id)

          if (intentErr && bookingErr) {
            console.error('[Sync] Failed to update booking remotely:', intentErr, bookingErr)
          } else {
            await window.electronAPI.db.clearSyncQueueItem(item.id)
            console.log(`[Sync] Successfully updated booking status for ${item.record_id} to ${payload.status}`)
          }
        } else if (item.action === 'UPDATE' && item.table_name === 'rooms') {
          const payload = JSON.parse(item.payload)
          const { error } = await supabase
            .from('rooms')
            .update({ status: mapRoomStatus(payload.status) })
            .eq('id', item.record_id)

          if (error) {
            console.error('[Sync] Failed to update room status remotely:', error)
          } else {
            await window.electronAPI.db.clearSyncQueueItem(item.id)
            console.log(`[Sync] Successfully updated room ${item.record_id} status to ${payload.status}`)
          }
        }
      }
    } catch (e) {
      console.error('[Sync] Error pushing changes:', e)
    }
  }

  // Set up repeating sync interval
  static startAutoSync(intervalMs = 15000) {
    console.log('[Sync] Starting auto-sync engine...')
    
    // Immediate initial sync
    this.pullInitialData().then(() => this.pushPendingChanges())
    
    setInterval(async () => {
      // Check online status conceptually
      if (navigator.onLine) {
        await this.pushPendingChanges()
        // Pull can be optimized using updated_at or real-time channels
        await this.pullInitialData()
      }
    }, intervalMs)
  }
}
