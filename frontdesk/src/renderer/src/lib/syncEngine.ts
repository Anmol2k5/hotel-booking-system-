import { supabase, PROPERTY_ID, DEVICE_ID } from './supabase'

export class SyncEngine {
  static isOnline = navigator.onLine
  static syncCount = 0

  static initListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('[Sync] Back online. Triggering sync...')
      this.pushPendingChanges()
      this.pullInitialData()
    })
    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('[Sync] Offline. Changes will be queued.')
    })
  }

  // 1. Pull data from server into local SQLite
  static async pullInitialData() {
    if (!this.isOnline) return

    try {
      // Pull rooms
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
          type_name: r.room_types?.name || 'Standard',
          rate: r.room_types?.base_rate || 0,
          amenities: r.amenities || '',
          updated_at: new Date().toISOString()
        }))
        await window.electronAPI.db.upsertRooms(mappedRooms)
        console.log(`[Sync] Pulled ${mappedRooms.length} rooms.`)
      }

      // Pull guests
      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .eq('property_id', PROPERTY_ID)

      if (guests) {
        for (const g of guests) {
          const existing = await window.electronAPI.db.getGuestById(g.id)
          if (!existing) {
            await window.electronAPI.db.createGuest({
              id: g.id,
              property_id: g.property_id,
              first_name: g.first_name,
              last_name: g.last_name,
              phone: g.phone,
              email: g.email || '',
              id_type: g.id_type || '',
              id_number: g.id_number || '',
              address: g.address || '',
              city: g.city || '',
              country: g.country || 'IN',
              vip: g.vip ? 1 : 0,
              total_stays: g.total_stays || 0,
              total_spent: g.total_spent || 0,
              created_at: g.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }
        console.log(`[Sync] Pulled ${guests.length} guests.`)
      }

      // Pull confirmed bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', PROPERTY_ID)
        .in('status', ['confirmed', 'checkedin'])

      if (bookings) {
        for (const b of bookings) {
          const existing = await window.electronAPI.db.getBookingById(b.id)
          if (!existing) {
            await window.electronAPI.db.createBooking({
              id: b.id,
              booking_ref: b.booking_ref,
              property_id: b.property_id,
              room_id: b.room_id,
              guest_id: b.guest_id,
              guest_name: b.guest_name,
              guest_phone: b.guest_phone,
              guest_email: b.guest_email || '',
              check_in_date: b.check_in_date,
              check_out_date: b.check_out_date,
              adults: b.adults,
              children: b.children,
              room_rate: b.room_rate,
              base_amount: b.base_amount || 0,
              tax_amount: b.tax_amount || 0,
              extras_amount: b.extras_amount || 0,
              total_amount: b.total_amount,
              status: b.status,
              source: b.source,
              notes: b.notes || '',
              created_at: b.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }
        console.log(`[Sync] Pulled ${bookings.length} bookings.`)
      }
    } catch (e) {
      console.error('[Sync] Error pulling initial data:', e)
    }
  }

  // 2. Push offline actions to server
  static async pushPendingChanges() {
    if (!this.isOnline) return

    try {
      const queue = await window.electronAPI.db.getSyncQueue()
      if (queue.length === 0) return

      console.log(`[Sync] Processing ${queue.length} pending items...`)

      for (const item of queue) {
        try {
          if (item.action === 'INSERT' && item.table_name === 'bookings') {
            const booking = JSON.parse(item.payload)

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
              console.error('[Sync] Failed to push booking intent:', error)
            } else {
              await window.electronAPI.db.clearSyncQueueItem(item.id)
              console.log(`[Sync] Pushed intent for booking ${booking.id}`)
            }
          } else if (item.action === 'INSERT' && item.table_name === 'guests') {
            const guest = JSON.parse(item.payload)

            const { error } = await supabase
              .from('guests')
              .insert({
                id: guest.id,
                property_id: guest.property_id,
                first_name: guest.first_name,
                last_name: guest.last_name,
                phone: guest.phone,
                email: guest.email,
                city: guest.city,
                vip: guest.vip,
                created_at: guest.created_at
              })

            if (error) {
              console.error('[Sync] Failed to push guest:', error)
            } else {
              await window.electronAPI.db.clearSyncQueueItem(item.id)
              console.log(`[Sync] Pushed guest ${guest.id}`)
            }
          }
        } catch (e) {
          console.error(`[Sync] Failed to process queue item ${item.id}:`, e)
        }
      }

      this.syncCount++
    } catch (e) {
      console.error('[Sync] Error pushing changes:', e)
    }
  }

  // Set up repeating sync interval
  static startAutoSync(intervalMs = 15000) {
    console.log('[Sync] Starting auto-sync engine...')
    this.initListeners()

    // Immediate initial sync
    this.pullInitialData().then(() => this.pushPendingChanges())

    setInterval(async () => {
      if (this.isOnline) {
        await this.pushPendingChanges()
        await this.pullInitialData()
      }
    }, intervalMs)
  }

  static getStatus() {
    return {
      online: this.isOnline,
      syncCount: this.syncCount
    }
  }
}
