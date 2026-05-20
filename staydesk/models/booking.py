import uuid
from datetime import datetime
from database.db import Database


class BookingModel:
    def __init__(self):
        self.db = Database()

    def _generate_ref(self):
        ts = str(int(datetime.now().timestamp() * 1000))
        return f"BK-{ts[-6:]}"

    def get_all(self):
        return self.db.fetchall('SELECT * FROM bookings ORDER BY check_in_date DESC')

    def get_by_id(self, booking_id):
        return self.db.fetchone('SELECT * FROM bookings WHERE id = ?', (booking_id,))

    def get_by_ref(self, ref):
        return self.db.fetchone('SELECT * FROM bookings WHERE booking_ref = ?', (ref,))

    def get_today_checkins(self):
        today = datetime.now().strftime('%Y-%m-%d')
        return self.db.fetchall(
            "SELECT * FROM bookings WHERE check_in_date <= ? AND status = 'confirmed' ORDER BY check_in_date",
            (today,)
        )

    def get_today_checkouts(self):
        today = datetime.now().strftime('%Y-%m-%d')
        return self.db.fetchall(
            "SELECT * FROM bookings WHERE check_out_date <= ? AND status = 'checkedin' ORDER BY check_out_date",
            (today,)
        )

    def get_extras(self, booking_id):
        return self.db.fetchall('SELECT * FROM booking_extras WHERE booking_id = ?', (booking_id,))

    def get_payments(self, booking_id):
        return self.db.fetchall('SELECT * FROM payments WHERE booking_id = ?', (booking_id,))

    def create(self, room_id, guest_id, guest_name, guest_phone, guest_email,
               check_in, check_out, adults=1, children=0, room_rate=0,
               source='Direct', notes='', staff_id=None):
        from dateutil.relativedelta import relativedelta
        ci = datetime.fromisoformat(check_in)
        co = datetime.fromisoformat(check_out)
        nights = max(1, (co - ci).days)
        base = room_rate * nights
        gst_rate = float(self.db.fetchone("SELECT value FROM settings WHERE key = 'gst_rate'")['value'])
        tax = round(base * gst_rate / 100, 2)
        total = base + tax

        booking_id = f"bk-{uuid.uuid4().hex[:8]}"
        ref = self._generate_ref()
        now = datetime.now().isoformat()

        self.db.execute(
            'INSERT INTO bookings (id, booking_ref, property_id, room_id, guest_id, guest_name, guest_phone, guest_email, check_in_date, check_out_date, adults, children, room_rate, base_amount, tax_amount, extras_amount, total_amount, status, source, notes, processed_by_staff_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (booking_id, ref, '', room_id, guest_id, guest_name, guest_phone, guest_email,
             check_in, check_out, adults, children, room_rate, base, tax, 0, total,
             'confirmed', source, notes, staff_id, now, now)
        )

        if staff_id:
            comm_rate = float(self.db.fetchone(
                "SELECT commission_rate FROM staff_profiles WHERE id = ?", (staff_id,)
            )['commission_rate'] or 0)
            if comm_rate > 0:
                comm = round(base * comm_rate / 100, 2)
                self.db.execute(
                    'UPDATE staff_profiles SET earned_commission = earned_commission + ? WHERE id = ?',
                    (comm, staff_id)
                )

        return self.get_by_id(booking_id)

    def update_status(self, booking_id, status):
        now = datetime.now().isoformat()
        self.db.execute('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?', (status, now, booking_id))
        return self.get_by_id(booking_id)

    def update(self, booking_id, **kwargs):
        if not kwargs:
            return
        fields = ', '.join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values())
        values.append(datetime.now().isoformat())
        values.append(booking_id)
        self.db.execute(f'UPDATE bookings SET {fields}, updated_at = ? WHERE id = ?', values)
        return self.get_by_id(booking_id)

    def add_extra(self, booking_id, description, amount):
        extra_id = f"extra-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO booking_extras (id, booking_id, description, amount, created_at) VALUES (?,?,?,?,?)',
            (extra_id, booking_id, description, amount, now)
        )
        extras = self.db.fetchone(
            'SELECT COALESCE(SUM(amount), 0) as total FROM booking_extras WHERE booking_id = ?',
            (booking_id,)
        )['total']
        booking = self.get_by_id(booking_id)
        new_total = booking['base_amount'] + booking['tax_amount'] + extras
        self.db.execute(
            'UPDATE bookings SET extras_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?',
            (extras, new_total, now, booking_id)
        )
        return extra_id

    def add_payment(self, booking_id, amount, method, reference=''):
        payment_id = f"pay-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO payments (id, booking_id, amount, method, status, reference, created_at) VALUES (?,?,?,?,?,?,?)',
            (payment_id, booking_id, amount, method, 'completed', reference, now)
        )
        return payment_id

    def get_revenue_stats(self):
        today = datetime.now().strftime('%Y-%m-%d')
        today_rev = self.db.fetchone(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE check_in_date >= ?",
            (today,)
        )['total']
        total_rev = self.db.fetchone(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings"
        )['total']
        return {'today': today_rev, 'total': total_rev}
