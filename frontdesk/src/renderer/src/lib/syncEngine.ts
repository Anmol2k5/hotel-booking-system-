import { supabase, PROPERTY_ID, DEVICE_ID } from './supabase'

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
              source: booking.source,
              created_offline_at: booking.created_at,
              device_id: DEVICE_ID
            })

          if (error) {
            console.error('[Sync] Failed to push intent:', error)
          } else {
            await window.electronAPI.db.clearSyncQueueItem(item.id)
            console.log(`[Sync] Successfully pushed intent for local booking ${booking.id}`)
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
