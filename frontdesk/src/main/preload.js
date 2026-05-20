const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  db: {
    // Rooms
    getRooms: () => ipcRenderer.invoke('db:getRooms'),
    getRoomById: (id) => ipcRenderer.invoke('db:getRoomById', id),
    getAvailableRooms: (checkIn, checkOut) => ipcRenderer.invoke('db:getAvailableRooms', checkIn, checkOut),
    updateRoomStatus: (id, status, reason) => ipcRenderer.invoke('db:updateRoomStatus', id, status, reason),
    upsertRooms: (rooms) => ipcRenderer.invoke('db:upsertRooms', rooms),
    addRoom: (room) => ipcRenderer.invoke('db:addRoom', room),

    // Guests
    getGuests: () => ipcRenderer.invoke('db:getGuests'),
    getGuestById: (id) => ipcRenderer.invoke('db:getGuestById', id),
    searchGuests: (query) => ipcRenderer.invoke('db:searchGuests', query),
    createGuest: (guest) => ipcRenderer.invoke('db:createGuest', guest),
    updateGuest: (id, data) => ipcRenderer.invoke('db:updateGuest', id, data),

    // Bookings
    getBookings: () => ipcRenderer.invoke('db:getBookings'),
    getBookingById: (id) => ipcRenderer.invoke('db:getBookingById', id),
    getBookingByRef: (ref) => ipcRenderer.invoke('db:getBookingByRef', ref),
    getTodayCheckIns: () => ipcRenderer.invoke('db:getTodayCheckIns'),
    getTodayCheckOuts: () => ipcRenderer.invoke('db:getTodayCheckOuts'),
    getBookingExtras: (bookingId) => ipcRenderer.invoke('db:getBookingExtras', bookingId),
    getBookingPayments: (bookingId) => ipcRenderer.invoke('db:getBookingPayments', bookingId),
    createBooking: (booking) => ipcRenderer.invoke('db:createBooking', booking),
    updateBooking: (id, data) => ipcRenderer.invoke('db:updateBooking', id, data),
    addBookingExtra: (extra) => ipcRenderer.invoke('db:addBookingExtra', extra),
    addPayment: (payment) => ipcRenderer.invoke('db:addPayment', payment),

    // Sync & Settings
    getSyncQueue: () => ipcRenderer.invoke('db:getSyncQueue'),
    clearSyncQueueItem: (id) => ipcRenderer.invoke('db:clearSyncQueueItem', id),
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    updateSetting: (key, value) => ipcRenderer.invoke('db:updateSetting', key, value),
    getStats: () => ipcRenderer.invoke('db:getStats')
  }
})
