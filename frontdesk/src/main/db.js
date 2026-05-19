const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const isDev = !app.isPackaged;
const dbPath = isDev 
  ? path.join(__dirname, '../../local_data.db')
  : path.join(app.getPath('userData'), 'staydesk.db');

const db = new Database(dbPath, { verbose: isDev ? console.log : null });

// Initialize local schema
function initDb() {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      room_type_id TEXT,
      number TEXT,
      floor INTEGER,
      status TEXT,
      type_name TEXT,
      rate NUMERIC
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_ref TEXT,
      property_id TEXT,
      room_id TEXT,
      guest_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      check_in_date TEXT,
      check_out_date TEXT,
      adults INTEGER,
      children INTEGER,
      room_rate NUMERIC,
      status TEXT,
      source TEXT,
      sync_status TEXT DEFAULT 'pending',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      table_name TEXT,
      record_id TEXT,
      payload TEXT,
      created_at TEXT
    );
  `);
}

// Data access functions
const dbApi = {
  getRooms: () => db.prepare('SELECT * FROM rooms ORDER BY number ASC').all(),
  getBookings: () => db.prepare('SELECT * FROM bookings ORDER BY check_in_date DESC').all(),
  
  createBooking: (booking) => {
    const stmt = db.prepare(`
      INSERT INTO bookings (id, booking_ref, property_id, room_id, guest_id, guest_name, guest_phone, check_in_date, check_out_date, adults, children, room_rate, status, source, created_at)
      VALUES (@id, @booking_ref, @property_id, @room_id, @guest_id, @guest_name, @guest_phone, @check_in_date, @check_out_date, @adults, @children, @room_rate, @status, @source, @created_at)
    `);
    
    const syncStmt = db.prepare(`
      INSERT INTO sync_queue (action, table_name, record_id, payload, created_at)
      VALUES ('INSERT', 'bookings', ?, ?, ?)
    `);

    const transaction = db.transaction((b) => {
      stmt.run(b);
      syncStmt.run(b.id, JSON.stringify(b), new Date().toISOString());
    });
    
    transaction(booking);
    return booking;
  },

  upsertRooms: (rooms) => {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, property_id, room_type_id, number, floor, status, type_name, rate)
      VALUES (@id, @property_id, @room_type_id, @number, @floor, @status, @type_name, @rate)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        type_name = excluded.type_name,
        rate = excluded.rate
    `);
    const transaction = db.transaction((rs) => {
      for (const r of rs) stmt.run(r);
    });
    transaction(rooms);
  },

  getSyncQueue: () => db.prepare('SELECT * FROM sync_queue ORDER BY id ASC').all(),
  clearSyncQueueItem: (id) => db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id)
};

module.exports = { db, initDb, dbApi };
