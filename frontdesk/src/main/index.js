const { app, BrowserWindow } = require('electron')
const path = require('path')
const { initDb, dbApi } = require('./db')

initDb()

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

  // Database IPC Handlers
  ipcMain.handle('db:getRooms', () => dbApi.getRooms())
  ipcMain.handle('db:getBookings', () => dbApi.getBookings())
  ipcMain.handle('db:createBooking', (_, booking) => dbApi.createBooking(booking))
  ipcMain.handle('db:upsertRooms', (_, rooms) => dbApi.upsertRooms(rooms))
  ipcMain.handle('db:getSyncQueue', () => dbApi.getSyncQueue())
  ipcMain.handle('db:clearSyncQueueItem', (_, id) => dbApi.clearSyncQueueItem(id))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
