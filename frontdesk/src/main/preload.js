const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  db: {
    getRooms: () => ipcRenderer.invoke('db:getRooms'),
    getBookings: () => ipcRenderer.invoke('db:getBookings'),
    createBooking: (booking) => ipcRenderer.invoke('db:createBooking', booking),
    upsertRooms: (rooms) => ipcRenderer.invoke('db:upsertRooms', rooms),
    getSyncQueue: () => ipcRenderer.invoke('db:getSyncQueue'),
    clearSyncQueueItem: (id) => ipcRenderer.invoke('db:clearSyncQueueItem', id)
  }
})
