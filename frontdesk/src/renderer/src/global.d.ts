export interface LocalRoom {
  id: string;
  property_id: string;
  room_type_id: string;
  number: string;
  floor: number;
  status: string;
  type_name: string;
  rate: number;
  amenities?: string;
  updated_at?: string;
}

export interface LocalGuest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_type?: string;
  id_number?: string;
  address?: string;
  city?: string;
  country?: string;
  vip?: number;
  total_stays?: number;
  total_spent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LocalBooking {
  id: string;
  booking_ref: string;
  property_id: string;
  room_id: string;
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  room_rate: number;
  base_amount?: number;
  tax_amount?: number;
  extras_amount?: number;
  total_amount: number;
  status: string;
  source: string;
  notes?: string;
  sync_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface BookingExtra {
  id: string;
  booking_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
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

export interface AppSettings {
  property_name: string;
  property_address: string;
  property_phone: string;
  property_gstin: string;
  gst_rate: string;
  currency: string;
  check_in_time: string;
  check_out_time: string;
}

export interface AppStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  checkoutRooms: number;
  maintenanceRooms: number;
  reservedRooms: number;
  totalBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalGuests: number;
  todayRevenue: number;
}

declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      db: {
        // Rooms
        getRooms: () => Promise<LocalRoom[]>;
        getRoomById: (id: string) => Promise<LocalRoom>;
        getAvailableRooms: (checkIn: string, checkOut: string) => Promise<LocalRoom[]>;
        updateRoomStatus: (id: string, status: string, reason?: string) => Promise<void>;
        upsertRooms: (rooms: LocalRoom[]) => Promise<void>;
        addRoom: (room: LocalRoom) => Promise<LocalRoom>;
        // Guests
        getGuests: () => Promise<LocalGuest[]>;
        getGuestById: (id: string) => Promise<LocalGuest>;
        searchGuests: (query: string) => Promise<LocalGuest[]>;
        createGuest: (guest: LocalGuest) => Promise<LocalGuest>;
        updateGuest: (id: string, data: Partial<LocalGuest>) => Promise<LocalGuest>;
        // Bookings
        getBookings: () => Promise<LocalBooking[]>;
        getBookingById: (id: string) => Promise<LocalBooking>;
        getBookingByRef: (ref: string) => Promise<LocalBooking>;
        getTodayCheckIns: () => Promise<LocalBooking[]>;
        getTodayCheckOuts: () => Promise<LocalBooking[]>;
        getBookingExtras: (bookingId: string) => Promise<BookingExtra[]>;
        getBookingPayments: (bookingId: string) => Promise<Payment[]>;
        createBooking: (booking: LocalBooking) => Promise<LocalBooking>;
        updateBooking: (id: string, data: Partial<LocalBooking>) => Promise<LocalBooking>;
        addBookingExtra: (extra: BookingExtra) => Promise<BookingExtra>;
        addPayment: (payment: Payment) => Promise<Payment>;
        // Sync & Settings
        getSyncQueue: () => Promise<SyncQueueItem[]>;
        clearSyncQueueItem: (id: number) => Promise<void>;
        getSettings: () => Promise<AppSettings>;
        updateSetting: (key: string, value: string) => Promise<void>;
        getStats: () => Promise<AppStats>;
      }
    }
  }
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
        updateBookingStatus: (id: string, status: string) => Promise<{ id: string; status: string }>;
        updateRoomStatus: (id: string, status: string) => Promise<{ id: string; status: string }>;
      }
    }
  }
}
