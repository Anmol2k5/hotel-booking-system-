import uuid
from datetime import datetime
from database.db import Database


class GuestModel:
    def __init__(self):
        self.db = Database()

    def get_all(self):
        return self.db.fetchall('SELECT * FROM guests ORDER BY last_name')

    def get_by_id(self, guest_id):
        return self.db.fetchone('SELECT * FROM guests WHERE id = ?', (guest_id,))

    def search(self, query):
        pattern = f"%{query}%"
        return self.db.fetchall(
            "SELECT * FROM guests WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY last_name",
            (pattern, pattern, pattern, pattern)
        )

    def create(self, first_name, last_name, phone='', email='', id_type='', id_number='',
               address='', city='', country='IN', vip=0):
        guest_id = f"guest-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO guests (id, property_id, first_name, last_name, phone, email, id_type, id_number, address, city, country, vip, total_stays, total_spent, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (guest_id, '', first_name, last_name, phone, email, id_type, id_number, address, city, country, vip, 0, 0, now, now)
        )
        return self.get_by_id(guest_id)

    def update(self, guest_id, **kwargs):
        if not kwargs:
            return
        fields = ', '.join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values())
        values.append(datetime.now().isoformat())
        values.append(guest_id)
        self.db.execute(f'UPDATE guests SET {fields}, updated_at = ? WHERE id = ?', values)
        return self.get_by_id(guest_id)

    def increment_stay(self, guest_id, amount_spent):
        self.db.execute(
            'UPDATE guests SET total_stays = total_stays + 1, total_spent = total_spent + ? WHERE id = ?',
            (amount_spent, guest_id)
        )
