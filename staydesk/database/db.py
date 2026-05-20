import sqlite3
import os
import random
from datetime import datetime, timedelta


class Database:
    _instance = None
    _conn = None

    def __new__(cls, db_path=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            if db_path is None:
                db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'staydesk.db')
            cls._instance._conn = sqlite3.connect(db_path, check_same_thread=False)
            cls._instance._conn.row_factory = sqlite3.Row
            cls._instance._conn.execute("PRAGMA journal_mode = WAL")
            cls._instance._conn.execute("PRAGMA foreign_keys = ON")
            cls._instance._init_schema()
        return cls._instance

    @property
    def conn(self):
        return self._conn

    def _init_schema(self):
        cursor = self._conn.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS properties (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('hotel', 'resort', 'motel', 'hostel', 'villa')) DEFAULT 'hotel',
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT DEFAULT 'IN',
                phone TEXT,
                email TEXT,
                gstin TEXT,
                total_rooms INTEGER DEFAULT 0,
                status TEXT CHECK(status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
                opened_date TEXT,
                created_at TEXT,
                updated_at TEXT
            );

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
                updated_at TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id)
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
                processed_by_staff_id TEXT,
                sync_status TEXT DEFAULT 'pending',
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id)
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

            CREATE TABLE IF NOT EXISTS staff_profiles (
                id TEXT PRIMARY KEY,
                property_id TEXT,
                username TEXT NOT NULL,
                pin_code TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'manager', 'front_desk', 'housekeeping')) DEFAULT 'front_desk',
                phone TEXT,
                base_salary NUMERIC DEFAULT 0,
                commission_rate NUMERIC DEFAULT 0,
                cleaning_commission NUMERIC DEFAULT 0,
                earned_commission NUMERIC DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id)
            );

            CREATE TABLE IF NOT EXISTS housekeeping_logs (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                staff_id TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                commission_earned NUMERIC DEFAULT 0,
                status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
                FOREIGN KEY(room_id) REFERENCES rooms(id),
                FOREIGN KEY(staff_id) REFERENCES staff_profiles(id)
            );

            CREATE TABLE IF NOT EXISTS daily_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id TEXT NOT NULL,
                date TEXT NOT NULL,
                total_revenue NUMERIC DEFAULT 0,
                total_bookings INTEGER DEFAULT 0,
                check_ins INTEGER DEFAULT 0,
                check_outs INTEGER DEFAULT 0,
                occupancy_rate NUMERIC DEFAULT 0,
                avg_room_rate NUMERIC DEFAULT 0,
                new_guests INTEGER DEFAULT 0,
                created_at TEXT,
                UNIQUE(property_id, date),
                FOREIGN KEY(property_id) REFERENCES properties(id)
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
        """)
        self._conn.commit()
        self._seed_defaults()

    def _seed_defaults(self):
        cursor = self._conn.cursor()
        defaults = [
            ('property_name', 'StayDesk Hotel'),
            ('property_address', '14 Ridge Road, Shimla Hills'),
            ('property_phone', '+91 98765 43210'),
            ('property_gstin', '02XXXXX1234X1ZX'),
            ('gst_rate', '12'),
            ('currency', '\u20b9'),
            ('check_in_time', '14:00'),
            ('check_out_time', '11:00'),
            ('cleaning_commission', '100'),
            ('front_desk_commission_rate', '2'),
            ('active_property_id', ''),
        ]
        for key, value in defaults:
            cursor.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', (key, value))
        self._conn.commit()

        cursor.execute('SELECT COUNT(*) FROM properties')
        if cursor.fetchone()[0] == 0:
            now = datetime.now().isoformat()
            properties = [
                ('prop-shimla-01', 'StayDesk Shimla', 'hotel', '14 Ridge Road, The Mall', 'Shimla', 'Himachal Pradesh', 'IN', '+91 98765 43210', 'shimla@staydesk.com', '02XXXXX1234X1ZX', 18, 'active', '2023-01-15', now, now),
                ('prop-manali-01', 'StayDesk Manali Resort', 'resort', 'Old Manali, Near Hadimba Temple', 'Manali', 'Himachal Pradesh', 'IN', '+91 98765 43211', 'manali@staydesk.com', '02XXXXX1234X2ZY', 24, 'active', '2023-06-01', now, now),
                ('prop-jaipur-01', 'StayDesk Jaipur Palace', 'hotel', 'MI Road, C-Scheme', 'Jaipur', 'Rajasthan', 'IN', '+91 98765 43212', 'jaipur@staydesk.com', '08XXXXX1234X3ZY', 30, 'active', '2023-09-10', now, now),
                ('prop-goa-01', 'StayDesk Goa Beach Villa', 'villa', 'Candolim Beach Road', 'Goa', 'Goa', 'IN', '+91 98765 43213', 'goa@staydesk.com', '30XXXXX1234X4ZY', 12, 'active', '2024-01-20', now, now),
            ]
            cursor.executemany(
                'INSERT INTO properties (id, name, type, address, city, state, country, phone, email, gstin, total_rooms, status, opened_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                properties
            )
            self._conn.commit()

            active_prop = properties[0][0]
            cursor.execute("UPDATE settings SET value = ? WHERE key = 'active_property_id'", (active_prop,))
            self._conn.commit()

            for prop_id, prop_name, prop_type, addr, city, state, country, phone, email, gstin, total_rooms, status, opened, _, _ in properties:
                cursor.execute('SELECT COUNT(*) FROM rooms WHERE property_id = ?', (prop_id,))
                if cursor.fetchone()[0] == 0:
                    room_types = [
                        ('Standard', 2500), ('Deluxe', 4200), ('Suite', 7500), ('Premium', 9000)
                    ]
                    rooms = []
                    floors = max(1, total_rooms // 6)
                    room_count = 0
                    prop_short = prop_id.replace('prop-', '').replace('-01', '')
                    for floor in range(1, floors + 1):
                        for i in range(1, 7):
                            if room_count >= total_rooms:
                                break
                            num = f"{floor}{i:02d}"
                            type_name, rate = room_types[(floor - 1 + i) % len(room_types)]
                            if prop_type == 'resort':
                                rate = int(rate * 1.3)
                            elif prop_type == 'villa':
                                rate = int(rate * 1.5)
                            room_id = f"room-{prop_short}-{num}"
                            rooms.append((room_id, prop_id, '', num, floor, 'available', type_name, rate, '', now))
                            room_count += 1
                    cursor.executemany(
                        'INSERT INTO rooms (id, property_id, room_type_id, number, floor, status, type_name, rate, amenities, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                        rooms
                    )

                cursor.execute('SELECT COUNT(*) FROM staff_profiles WHERE property_id = ?', (prop_id,))
                if cursor.fetchone()[0] == 0:
                    prop_short = prop_id.replace('prop-', '').replace('-01', '')
                    staff = [
                        (f"staff-{prop_short}-admin", prop_id, 'Admin', '1234', 'admin', phone, 50000, 0, 0, 0, 1, now, now),
                        (f"staff-{prop_short}-mgr", prop_id, 'Manager', '5678', 'manager', phone, 40000, 2, 0, 0, 1, now, now),
                        (f"staff-{prop_short}-fd1", prop_id, 'Priya', '1111', 'front_desk', phone, 25000, 2, 0, 0, 1, now, now),
                        (f"staff-{prop_short}-hk1", prop_id, 'Ram Singh', '3333', 'housekeeping', phone, 18000, 0, 100, 0, 1, now, now),
                    ]
                    cursor.executemany(
                        'INSERT INTO staff_profiles (id, property_id, username, pin_code, role, phone, base_salary, commission_rate, cleaning_commission, earned_commission, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        staff
                    )

                for days_ago in range(30, 0, -1):
                    d = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                    cursor.execute('SELECT COUNT(*) FROM daily_metrics WHERE property_id = ? AND date = ?', (prop_id, d))
                    if cursor.fetchone()[0] == 0:
                        base_rev = {'prop-shimla-01': 45000, 'prop-manali-01': 62000, 'prop-jaipur-01': 78000, 'prop-goa-01': 55000}
                        rev = base_rev.get(prop_id, 40000)
                        trend = 1 + (30 - days_ago) * 0.02
                        rev = int(rev * trend * (0.8 + random.random() * 0.4))
                        occ = min(95, 40 + days_ago * 0.5 + random.random() * 20)
                        bookings = random.randint(3, 12)
                        checkins = random.randint(2, 8)
                        checkouts = random.randint(2, 7)
                        avg_rate = rev // max(1, bookings)
                        new_guests = random.randint(1, 5)
                        cursor.execute(
                            'INSERT INTO daily_metrics (property_id, date, total_revenue, total_bookings, check_ins, check_outs, occupancy_rate, avg_room_rate, new_guests, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                            (prop_id, d, rev, bookings, checkins, checkouts, round(occ, 1), avg_rate, new_guests, now)
                        )

            self._conn.commit()

            cursor.execute('SELECT COUNT(*) FROM guests WHERE property_id IS NULL OR property_id = ?', (active_prop,))
            if cursor.fetchone()[0] == 0:
                guests = [
                    ('guest-001', active_prop, 'Rajesh', 'Kumar', '+91 98765 43210', 'rajesh@email.com', 'Aadhaar', '', 'Mumbai', 'Mumbai', 'IN', 1, 4, 42600, now, now),
                    ('guest-002', active_prop, 'Priya', 'Sharma', '+91 87654 32109', 'priya@email.com', '', '', 'Delhi', 'Delhi', 'IN', 0, 2, 25800, now, now),
                    ('guest-003', active_prop, 'Amit', 'Singh', '+91 76543 21098', 'amit@email.com', 'Passport', '', 'Pune', 'Pune', 'IN', 1, 7, 78400, now, now),
                    ('guest-004', active_prop, 'Neha', 'Patel', '+91 65432 10987', 'neha@email.com', '', '', 'Bangalore', 'Bangalore', 'IN', 0, 1, 9200, now, now),
                    ('guest-005', active_prop, 'Vikram', 'Rao', '+91 54321 09876', 'vikram@email.com', '', '', 'Chennai', 'Chennai', 'IN', 0, 3, 34100, now, now),
                ]
                cursor.executemany(
                    'INSERT INTO guests (id, property_id, first_name, last_name, phone, email, id_type, id_number, address, city, country, vip, total_stays, total_spent, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    guests
                )
                self._conn.commit()

    def execute(self, query, params=()):
        cursor = self._conn.cursor()
        cursor.execute(query, params)
        self._conn.commit()
        return cursor

    def executemany(self, query, params_list):
        cursor = self._conn.cursor()
        cursor.executemany(query, params_list)
        self._conn.commit()
        return cursor

    def fetchone(self, query, params=()):
        cursor = self._conn.cursor()
        cursor.execute(query, params)
        return cursor.fetchone()

    def fetchall(self, query, params=()):
        cursor = self._conn.cursor()
        cursor.execute(query, params)
        return cursor.fetchall()

    def commit(self):
        self._conn.commit()

    def close(self):
        if self._conn:
            self._conn.close()
