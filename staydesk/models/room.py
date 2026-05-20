import uuid
from datetime import datetime
from database.db import Database


class RoomModel:
    def __init__(self):
        self.db = Database()

    def get_all(self):
        return self.db.fetchall('SELECT * FROM rooms ORDER BY CAST(number AS INTEGER)')

    def get_by_id(self, room_id):
        return self.db.fetchone('SELECT * FROM rooms WHERE id = ?', (room_id,))

    def get_available(self, check_in, check_out):
        return self.db.fetchall("""
            SELECT r.* FROM rooms r
            WHERE r.status = 'available'
            AND r.id NOT IN (
                SELECT b.room_id FROM bookings b
                WHERE b.status IN ('confirmed', 'checkedin')
                AND b.check_in_date < ? AND b.check_out_date > ?
            )
            ORDER BY CAST(r.number AS INTEGER)
        """, (check_out, check_in))

    def get_by_status(self, status):
        return self.db.fetchall('SELECT * FROM rooms WHERE status = ? ORDER BY CAST(number AS INTEGER)', (status,))

    def update_status(self, room_id, status, reason=''):
        old = self.db.fetchone('SELECT status FROM rooms WHERE id = ?', (room_id,))
        now = datetime.now().isoformat()
        self.db.execute('UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?', (status, now, room_id))
        self.db.execute(
            'INSERT INTO room_status_history (room_id, old_status, new_status, reason, changed_at) VALUES (?,?,?,?,?)',
            (room_id, old['status'] if old else '', status, reason, now)
        )

    def add(self, number, floor, type_name, rate, amenities=''):
        room_id = f"room-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO rooms (id, property_id, room_type_id, number, floor, status, type_name, rate, amenities, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
            (room_id, '', '', number, floor, 'available', type_name, rate, amenities, now)
        )
        return self.get_by_id(room_id)

    def update(self, room_id, **kwargs):
        if not kwargs:
            return
        fields = ', '.join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values())
        values.append(datetime.now().isoformat())
        values.append(room_id)
        self.db.execute(f'UPDATE rooms SET {fields}, updated_at = ? WHERE id = ?', values)
        return self.get_by_id(room_id)

    def get_stats(self):
        total = self.db.fetchone('SELECT COUNT(*) as count FROM rooms')['count']
        available = self.db.fetchone("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'")['count']
        occupied = self.db.fetchone("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'")['count']
        checkout = self.db.fetchone("SELECT COUNT(*) as count FROM rooms WHERE status = 'checkout'")['count']
        maintenance = self.db.fetchone("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'")['count']
        reserved = self.db.fetchone("SELECT COUNT(*) as count FROM rooms WHERE status = 'reserved'")['count']
        return {
            'total': total, 'available': available, 'occupied': occupied,
            'checkout': checkout, 'maintenance': maintenance, 'reserved': reserved
        }

    def get_status_history(self, room_id):
        return self.db.fetchall(
            'SELECT * FROM room_status_history WHERE room_id = ? ORDER BY changed_at DESC',
            (room_id,)
        )
