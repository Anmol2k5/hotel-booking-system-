export interface LocalRoom {
  id: string;
  property_id: string;
  room_type_id: string;
  number: string;
  floor: number;
  status: string;
  type_name: string;
  rate: number;
}

export interface LocalBooking {
  id: string;
  booking_ref: string;
  property_id: string;
  room_id: string;
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  room_rate: number;
  status: string;
  source: string;
  sync_status?: string;
  created_at: string;
}

export interface SyncQueueItem {
  id: number;
  action: string;
  table_name: string;
  record_id: string;
  payload: string;
  created_at: string;
}

declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      db: {
        getRooms: () => Promise<LocalRoom[]>;
        getBookings: () => Promise<LocalBooking[]>;
        createBooking: (booking: LocalBooking) => Promise<LocalBooking>;
        upsertRooms: (rooms: LocalRoom[]) => Promise<void>;
        getSyncQueue: () => Promise<SyncQueueItem[]>;
        clearSyncQueueItem: (id: number) => Promise<void>;
      }
    }
  }
}
