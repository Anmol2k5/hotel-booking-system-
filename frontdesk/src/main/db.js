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
      status TEXT DEFAULT 'available',
      type_name TEXT,
      rate NUMERIC,
      amenities TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      id_type TEXT,
      id_number TEXT,
      address TEXT,
      city TEXT,
      country TEXT DEFAULT 'IN',
      vip INTEGER DEFAULT 0,
      total_stays INTEGER DEFAULT 0,
      total_spent NUMERIC DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_ref TEXT,
      property_id TEXT,
      room_id TEXT,
      guest_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      guest_email TEXT,
      check_in_date TEXT,
      check_out_date TEXT,
      adults INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      room_rate NUMERIC,
      base_amount NUMERIC,
      tax_amount NUMERIC DEFAULT 0,
      extras_amount NUMERIC DEFAULT 0,
      total_amount NUMERIC,
      status TEXT DEFAULT 'confirmed',
      source TEXT DEFAULT 'Direct',
      notes TEXT,
      sync_status TEXT DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS booking_extras (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      description TEXT,
      amount NUMERIC,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      amount NUMERIC,
      method TEXT,
      status TEXT DEFAULT 'completed',
      reference TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS room_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      old_status TEXT,
      new_status TEXT,
      reason TEXT,
      changed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      table_name TEXT,
      record_id TEXT,
      payload TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Default settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('property_name', 'StayDesk Hotel');
  insertSetting.run('property_address', '14 Ridge Road, Shimla Hills');
  insertSetting.run('property_phone', '+91 98765 43210');
  insertSetting.run('property_gstin', '02XXXXX1234X1ZX');
  insertSetting.run('gst_rate', '12');
  insertSetting.run('currency', '₹');
  insertSetting.run('check_in_time', '14:00');
  insertSetting.run('check_out_time', '11:00');
}

// Data access functions
const dbApi = {
  // Rooms
  getRooms: () => db.prepare('SELECT * FROM rooms ORDER BY CAST(number AS INTEGER) ASC').all(),
  getRoomById: (id) => db.prepare('SELECT * FROM rooms WHERE id = ?').get(id),
  getAvailableRooms: (checkIn, checkOut) => db.prepare(`
    SELECT r.* FROM rooms r 
    WHERE r.status = 'available'
    AND r.id NOT IN (
      SELECT b.room_id FROM bookings b 
      WHERE b.status IN ('confirmed', 'checkedin')
      AND b.check_in_date < ? AND b.check_out_date > ?
    )
    ORDER BY CAST(r.number AS INTEGER) ASC
  `).all(checkOut, checkIn),
  updateRoomStatus: (id, status, reason = '') => {
    const getOld = db.prepare('SELECT status FROM rooms WHERE id = ?').get(id);
    const update = db.prepare('UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?');
    const history = db.prepare('INSERT INTO room_status_history (room_id, old_status, new_status, reason, changed_at) VALUES (?, ?, ?, ?, ?)');
    const transaction = db.transaction(() => {
      update.run(status, new Date().toISOString(), id);
      history.run(id, getOld?.status, status, reason, new Date().toISOString());
    });
    transaction();
  },
  upsertRooms: (rooms) => {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, property_id, room_type_id, number, floor, status, type_name, rate, amenities, updated_at)
      VALUES (@id, @property_id, @room_type_id, @number, @floor, @status, @type_name, @rate, @amenities, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        type_name = excluded.type_name,
        rate = excluded.rate,
        amenities = excluded.amenities,
        updated_at = excluded.updated_at
    `);
    const transaction = db.transaction((rs) => {
      for (const r of rs) stmt.run(r);
    });
    transaction(rooms);
  },
  addRoom: (room) => {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, property_id, room_type_id, number, floor, status, type_name, rate, amenities, updated_at)
      VALUES (@id, @property_id, @room_type_id, @number, @floor, @status, @type_name, @rate, @amenities, @updated_at)
    `);
    stmt.run(room);
    return room;
  },

  // Guests
  getGuests: () => db.prepare('SELECT * FROM guests ORDER BY last_name ASC').all(),
  getGuestById: (id) => db.prepare('SELECT * FROM guests WHERE id = ?').get(id),
  searchGuests: (query) => db.prepare(`
    SELECT * FROM guests 
    WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?
    ORDER BY last_name ASC
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`),
  createGuest: (guest) => {
    const stmt = db.prepare(`
      INSERT INTO guests (id, property_id, first_name, last_name, phone, email, id_type, id_number, address, city, country, vip, total_stays, total_spent, created_at, updated_at)
      VALUES (@id, @property_id, @first_name, @last_name, @phone, @email, @id_type, @id_number, @address, @city, @country, @vip, @total_stays, @total_spent, @created_at, @updated_at)
    `);
    const syncStmt = db.prepare(`
      INSERT INTO sync_queue (action, table_name, record_id, payload, created_at)
      VALUES ('INSERT', 'guests', ?, ?, ?)
    `);
    const transaction = db.transaction((g) => {
      stmt.run(g);
      syncStmt.run(g.id, JSON.stringify(g), new Date().toISOString());
    });
    transaction(guest);
    return guest;
  },
  updateGuest: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    db.prepare(`UPDATE guests SET ${fields}, updated_at = ? WHERE id = ?`).run(...values, new Date().toISOString(), id);
    return db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
  },

  // Bookings
  getBookings: () => db.prepare('SELECT * FROM bookings ORDER BY check_in_date DESC').all(),
  getBookingById: (id) => db.prepare('SELECT * FROM bookings WHERE id = ?').get(id),
  getBookingByRef: (ref) => db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(ref),
  getTodayCheckIns: () => {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare("SELECT * FROM bookings WHERE check_in_date <= ? AND status = 'confirmed' ORDER BY check_in_date ASC").all(today);
  },
  getTodayCheckOuts: () => {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare("SELECT * FROM bookings WHERE check_out_date <= ? AND status = 'checkedin' ORDER BY check_out_date ASC").all(today);
  },
  getBookingExtras: (bookingId) => db.prepare('SELECT * FROM booking_extras WHERE booking_id = ?').all(bookingId),
  getBookingPayments: (bookingId) => db.prepare('SELECT * FROM payments WHERE booking_id = ?').all(bookingId),
  createBooking: (booking) => {
    const stmt = db.prepare(`
      INSERT INTO bookings (id, booking_ref, property_id, room_id, guest_id, guest_name, guest_phone, guest_email, check_in_date, check_out_date, adults, children, room_rate, base_amount, tax_amount, extras_amount, total_amount, status, source, notes, created_at, updated_at)
      VALUES (@id, @booking_ref, @property_id, @room_id, @guest_id, @guest_name, @guest_phone, @guest_email, @check_in_date, @check_out_date, @adults, @children, @room_rate, @base_amount, @tax_amount, @extras_amount, @total_amount, @status, @source, @notes, @created_at, @updated_at)
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
  updateBooking: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    db.prepare(`UPDATE bookings SET ${fields}, updated_at = ? WHERE id = ?`).run(...values, new Date().toISOString(), id);
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  },
  addBookingExtra: (extra) => {
    const stmt = db.prepare(`
      INSERT INTO booking_extras (id, booking_id, description, amount, created_at)
      VALUES (@id, @booking_id, @description, @amount, @created_at)
    `);
    stmt.run(extra);
    // Update booking extras_amount and total_amount
    const extras = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM booking_extras WHERE booking_id = ?').get(extra.booking_id);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(extra.booking_id);
    const newExtras = extras.total;
    const newTotal = (booking.base_amount || booking.total_amount) + newExtras - (booking.extras_amount || 0);
    db.prepare('UPDATE bookings SET extras_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?')
      .run(newExtras, newTotal, new Date().toISOString(), extra.booking_id);
    return extra;
  },
  addPayment: (payment) => {
    const stmt = db.prepare(`
      INSERT INTO payments (id, booking_id, amount, method, status, reference, created_at)
      VALUES (@id, @booking_id, @amount, @method, @status, @reference, @created_at)
    `);
    stmt.run(payment);
    return payment;
  },

  // Sync
  getSyncQueue: () => db.prepare('SELECT * FROM sync_queue ORDER BY id ASC').all(),
  clearSyncQueueItem: (id) => db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id),

  // Settings
  getSettings: () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    return obj;
  },
  updateSetting: (key, value) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  },

  // Stats
  getStats: () => {
    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
    const availableRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get().count;
    const occupiedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count;
    const checkoutRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'checkout'").get().count;
    const maintenanceRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'").get().count;
    const reservedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'reserved'").get().count;
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const todayCheckIns = dbApi.getTodayCheckIns().length;
    const todayCheckOuts = dbApi.getTodayCheckOuts().length;
    const totalGuests = db.prepare('SELECT COUNT(*) as count FROM guests').get().count;
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings 
      WHERE check_in_date >= date('now', 'start of day')
    `).get().total;
    return {
      totalRooms, availableRooms, occupiedRooms, checkoutRooms, maintenanceRooms, reservedRooms,
      totalBookings, todayCheckIns, todayCheckOuts, totalGuests, todayRevenue
    };
  }
};

module.exports = { db, initDb, dbApi };

// Seed sample data for demo
function seedData() {
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount > 0) return; // Already seeded

  console.log('[DB] Seeding sample data...');
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  // Seed rooms
  const roomTypes = [
    { type: 'Standard', rate: 2500 },
    { type: 'Deluxe', rate: 4200 },
    { type: 'Suite', rate: 7500 },
    { type: 'Premium', rate: 9000 }
  ];
  const rooms = [];
  for (let floor = 1; floor <= 3; floor++) {
    for (let i = 1; i <= 6; i++) {
      const num = `${floor}${String(i).padStart(2, '0')}`;
      const type = roomTypes[(floor - 1 + i) % roomTypes.length];
      rooms.push({
        id: `room-${num}`,
        property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        room_type_id: '',
        number: num,
        floor,
        status: 'available',
        type_name: type.type,
        rate: type.rate,
        amenities: '',
        updated_at: new Date().toISOString()
      });
    }
  }
  dbApi.upsertRooms(rooms);

  // Seed guests
  const guests = [
    { id: 'guest-001', first_name: 'Rajesh', last_name: 'Kumar', phone: '+91 98765 43210', email: 'rajesh@email.com', city: 'Mumbai', vip: 1, total_stays: 4, total_spent: 42600 },
    { id: 'guest-002', first_name: 'Priya', last_name: 'Sharma', phone: '+91 87654 32109', email: 'priya@email.com', city: 'Delhi', vip: 0, total_stays: 2, total_spent: 25800 },
    { id: 'guest-003', first_name: 'Amit', last_name: 'Singh', phone: '+91 76543 21098', email: 'amit@email.com', city: 'Pune', vip: 1, total_stays: 7, total_spent: 78400 },
    { id: 'guest-004', first_name: 'Neha', last_name: 'Patel', phone: '+91 65432 10987', email: 'neha@email.com', city: 'Bangalore', vip: 0, total_stays: 1, total_spent: 9200 },
    { id: 'guest-005', first_name: 'Vikram', last_name: 'Rao', phone: '+91 54321 09876', email: 'vikram@email.com', city: 'Chennai', vip: 0, total_stays: 3, total_spent: 34100 },
  ];
  for (const g of guests) {
    dbApi.createGuest({
      ...g, property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      id_type: '', id_number: '', address: '', country: 'IN',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
  }

  // Seed today's check-ins
  const checkIns = [
    { id: 'bk-ci-001', ref: 'BK-0041', guest_id: 'guest-001', guest_name: 'Rajesh Kumar', guest_phone: '+91 98765 43210', room_id: 'room-109', check_in: today, check_out: tomorrow, adults: 2, children: 0, rate: 4200, source: 'Direct', status: 'confirmed' },
    { id: 'bk-ci-002', ref: 'BK-0042', guest_id: 'guest-002', guest_name: 'Priya Sharma', guest_phone: '+91 87654 32109', room_id: 'room-211', check_in: today, check_out: dayAfter, adults: 1, children: 0, rate: 2500, source: 'MakeMyTrip', status: 'confirmed' },
  ];
  for (const b of checkIns) {
    const base = b.rate * differenceInDays(new Date(b.check_out), new Date(b.check_in));
    const tax = Math.round(base - base / 1.12);
    dbApi.createBooking({
      id: b.id, booking_ref: b.ref, property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      room_id: b.room_id, guest_id: b.guest_id, guest_name: b.guest_name, guest_phone: b.guest_phone,
      guest_email: '', check_in_date: b.check_in, check_out_date: b.check_out,
      adults: b.adults, children: b.children, room_rate: b.rate,
      base_amount: base, tax_amount: tax, extras_amount: 0, total_amount: base + tax,
      status: b.status, source: b.source, notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
  }

  // Seed today's check-outs
  const checkOuts = [
    { id: 'bk-co-001', ref: 'BK-0039', guest_id: 'guest-003', guest_name: 'Amit Singh', guest_phone: '+91 76543 21098', room_id: 'room-103', check_in: yesterday, check_out: today, adults: 2, children: 1, rate: 7500, source: 'Booking.com', status: 'checkedin' },
    { id: 'bk-co-002', ref: 'BK-0035', guest_id: 'guest-004', guest_name: 'Neha Patel', guest_phone: '+91 65432 10987', room_id: 'room-205', check_in: yesterday, check_out: today, adults: 1, children: 0, rate: 4200, source: 'Walk-in', status: 'checkedin' },
  ];
  for (const b of checkOuts) {
    const base = b.rate * differenceInDays(new Date(b.check_out), new Date(b.check_in));
    const tax = Math.round(base - base / 1.12);
    dbApi.createBooking({
      id: b.id, booking_ref: b.ref, property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      room_id: b.room_id, guest_id: b.guest_id, guest_name: b.guest_name, guest_phone: b.guest_phone,
      guest_email: '', check_in_date: b.check_in, check_out_date: b.check_out,
      adults: b.adults, children: b.children, room_rate: b.rate,
      base_amount: base, tax_amount: tax, extras_amount: 0, total_amount: base + tax,
      status: b.status, source: b.source, notes: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
  }

  console.log('[DB] Sample data seeded successfully.');
}

function differenceInDays(d1, d2) {
  return Math.round((d1 - d2) / 86400000);
}

