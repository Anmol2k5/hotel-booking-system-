const { app, BrowserWindow } = require('electron')
const path = require('path')
const { initDb, dbApi, seedData } = require('./db')

initDb()
seedData()

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../renderer/src/assets/icon.ico')
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Expose window controls via IPC
  const { ipcMain } = require('electron')
  ipcMain.on('window-minimize', () => win.minimize())
  ipcMain.on('window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize())
  ipcMain.on('window-close', () => win.close())

  // Database IPC Handlers - Rooms
  ipcMain.handle('db:getRooms', () => dbApi.getRooms())
  ipcMain.handle('db:getRoomById', (_, id) => dbApi.getRoomById(id))
  ipcMain.handle('db:getAvailableRooms', (_, checkIn, checkOut) => dbApi.getAvailableRooms(checkIn, checkOut))
  ipcMain.handle('db:updateRoomStatus', (_, id, status, reason) => dbApi.updateRoomStatus(id, status, reason))
  ipcMain.handle('db:upsertRooms', (_, rooms) => dbApi.upsertRooms(rooms))
  ipcMain.handle('db:addRoom', (_, room) => dbApi.addRoom(room))

  // Database IPC Handlers - Guests
  ipcMain.handle('db:getGuests', () => dbApi.getGuests())
  ipcMain.handle('db:getGuestById', (_, id) => dbApi.getGuestById(id))
  ipcMain.handle('db:searchGuests', (_, query) => dbApi.searchGuests(query))
  ipcMain.handle('db:createGuest', (_, guest) => dbApi.createGuest(guest))
  ipcMain.handle('db:updateGuest', (_, id, data) => dbApi.updateGuest(id, data))

  // Database IPC Handlers - Bookings
  ipcMain.handle('db:getBookings', () => dbApi.getBookings())
  ipcMain.handle('db:getBookingById', (_, id) => dbApi.getBookingById(id))
  ipcMain.handle('db:getBookingByRef', (_, ref) => dbApi.getBookingByRef(ref))
  ipcMain.handle('db:getTodayCheckIns', () => dbApi.getTodayCheckIns())
  ipcMain.handle('db:getTodayCheckOuts', () => dbApi.getTodayCheckOuts())
  ipcMain.handle('db:getBookingExtras', (_, bookingId) => dbApi.getBookingExtras(bookingId))
  ipcMain.handle('db:getBookingPayments', (_, bookingId) => dbApi.getBookingPayments(bookingId))
  ipcMain.handle('db:createBooking', (_, booking) => dbApi.createBooking(booking))
  ipcMain.handle('db:updateBooking', (_, id, data) => dbApi.updateBooking(id, data))
  ipcMain.handle('db:addBookingExtra', (_, extra) => dbApi.addBookingExtra(extra))
  ipcMain.handle('db:addPayment', (_, payment) => dbApi.addPayment(payment))

  // Database IPC Handlers - Sync & Settings
  ipcMain.handle('db:getSyncQueue', () => dbApi.getSyncQueue())
  ipcMain.handle('db:clearSyncQueueItem', (_, id) => dbApi.clearSyncQueueItem(id))
  ipcMain.handle('db:getSettings', () => dbApi.getSettings())
  ipcMain.handle('db:updateSetting', (_, key, value) => dbApi.updateSetting(key, value))
  ipcMain.handle('db:getStats', () => dbApi.getStats())
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
