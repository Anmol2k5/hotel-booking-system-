import uuid
from datetime import datetime
from database.db import Database


class StaffModel:
    def __init__(self):
        self.db = Database()

    def get_all(self):
        return self.db.fetchall('SELECT * FROM staff_profiles WHERE active = 1 ORDER BY username')

    def get_by_id(self, staff_id):
        return self.db.fetchone('SELECT * FROM staff_profiles WHERE id = ?', (staff_id,))

    def authenticate(self, pin_code):
        return self.db.fetchone('SELECT * FROM staff_profiles WHERE pin_code = ? AND active = 1', (pin_code,))

    def create(self, username, pin_code, role, phone='', base_salary=0, commission_rate=0, cleaning_commission=0):
        staff_id = f"staff-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO staff_profiles (id, username, pin_code, role, phone, base_salary, commission_rate, cleaning_commission, earned_commission, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            (staff_id, username, pin_code, role, phone, base_salary, commission_rate, cleaning_commission, 0, 1, now, now)
        )
        return self.get_by_id(staff_id)

    def update(self, staff_id, **kwargs):
        if not kwargs:
            return
        fields = ', '.join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values())
        values.append(datetime.now().isoformat())
        values.append(staff_id)
        self.db.execute(f'UPDATE staff_profiles SET {fields}, updated_at = ? WHERE id = ?', values)
        return self.get_by_id(staff_id)

    def add_commission(self, staff_id, amount):
        self.db.execute(
            'UPDATE staff_profiles SET earned_commission = earned_commission + ? WHERE id = ?',
            (amount, staff_id)
        )

    def reset_commission(self, staff_id):
        self.db.execute(
            'UPDATE staff_profiles SET earned_commission = 0 WHERE id = ?',
            (staff_id,)
        )

    def get_by_role(self, role):
        return self.db.fetchall('SELECT * FROM staff_profiles WHERE role = ? AND active = 1 ORDER BY username', (role,))
