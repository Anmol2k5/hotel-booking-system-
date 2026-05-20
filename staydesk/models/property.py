import uuid
from datetime import datetime, timedelta
from database.db import Database


class PropertyModel:
    def __init__(self):
        self.db = Database()

    def get_all(self):
        return self.db.fetchall('SELECT * FROM properties ORDER BY name')

    def get_by_id(self, prop_id):
        return self.db.fetchone('SELECT * FROM properties WHERE id = ?', (prop_id,))

    def get_active(self):
        return self.db.fetchall("SELECT * FROM properties WHERE status = 'active' ORDER BY name")

    def create(self, name, prop_type='hotel', address='', city='', state='', country='IN',
               phone='', email='', gstin='', total_rooms=0):
        prop_id = f"prop-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO properties (id, name, type, address, city, state, country, phone, email, gstin, total_rooms, status, opened_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (prop_id, name, prop_type, address, city, state, country, phone, email, gstin, total_rooms, 'active', now[:10], now, now)
        )
        return self.get_by_id(prop_id)

    def update(self, prop_id, **kwargs):
        if not kwargs:
            return
        fields = ', '.join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values())
        values.append(datetime.now().isoformat())
        values.append(prop_id)
        self.db.execute(f'UPDATE properties SET {fields}, updated_at = ? WHERE id = ?', values)
        return self.get_by_id(prop_id)

    def get_stats(self, prop_id=None):
        where = f"WHERE property_id = '{prop_id}'" if prop_id else ''
        total_rev = self.db.fetchone(f'SELECT COALESCE(SUM(total_revenue), 0) as total FROM daily_metrics {where}')['total']
        total_bookings = self.db.fetchone(f'SELECT COALESCE(SUM(total_bookings), 0) as total FROM daily_metrics {where}')['total']
        total_checkins = self.db.fetchone(f'SELECT COALESCE(SUM(check_ins), 0) as total FROM daily_metrics {where}')['total']
        total_checkouts = self.db.fetchone(f'SELECT COALESCE(SUM(check_outs), 0) as total FROM daily_metrics {where}')['total']
        avg_occ = self.db.fetchone(f'SELECT COALESCE(AVG(occupancy_rate), 0) as avg FROM daily_metrics {where}')['avg']
        new_guests = self.db.fetchone(f'SELECT COALESCE(SUM(new_guests), 0) as total FROM daily_metrics {where}')['total']
        return {
            'total_revenue': total_rev,
            'total_bookings': total_bookings,
            'total_checkins': total_checkins,
            'total_checkouts': total_checkouts,
            'avg_occupancy': round(avg_occ, 1),
            'new_guests': new_guests,
        }

    def get_today_stats(self, prop_id=None):
        today = datetime.now().strftime('%Y-%m-%d')
        if prop_id:
            row = self.db.fetchone('SELECT * FROM daily_metrics WHERE property_id = ? AND date = ?', (prop_id, today))
        else:
            row = self.db.fetchone(
                'SELECT COALESCE(SUM(total_revenue), 0) as total_revenue, COALESCE(SUM(total_bookings), 0) as total_bookings, COALESCE(SUM(check_ins), 0) as check_ins, COALESCE(SUM(check_outs), 0) as check_outs, COALESCE(AVG(occupancy_rate), 0) as occupancy_rate, COALESCE(AVG(avg_room_rate), 0) as avg_room_rate, COALESCE(SUM(new_guests), 0) as new_guests FROM daily_metrics WHERE date = ?',
                (today,)
            )
        if row:
            return dict(row)
        return {'total_revenue': 0, 'total_bookings': 0, 'check_ins': 0, 'check_outs': 0, 'occupancy_rate': 0, 'avg_room_rate': 0, 'new_guests': 0}

    def get_growth_trend(self, prop_id=None, days=30):
        since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        if prop_id:
            return self.db.fetchall(
                'SELECT * FROM daily_metrics WHERE property_id = ? AND date >= ? ORDER BY date',
                (prop_id, since)
            )
        else:
            return self.db.fetchall(
                'SELECT date, COALESCE(SUM(total_revenue), 0) as total_revenue, COALESCE(SUM(total_bookings), 0) as total_bookings, COALESCE(SUM(check_ins), 0) as check_ins, COALESCE(SUM(check_outs), 0) as check_outs, COALESCE(AVG(occupancy_rate), 0) as occupancy_rate, COALESCE(AVG(avg_room_rate), 0) as avg_room_rate, COALESCE(SUM(new_guests), 0) as new_guests FROM daily_metrics WHERE date >= ? GROUP BY date ORDER BY date',
                (since,)
            )

    def get_last_7_days(self, prop_id=None):
        return self.get_growth_trend(prop_id, 7)

    def get_last_30_days(self, prop_id=None):
        return self.get_growth_trend(prop_id, 30)

    def get_month_comparison(self, prop_id=None):
        now = datetime.now()
        this_month_start = now.replace(day=1).strftime('%Y-%m-%d')
        last_month_end = (now.replace(day=1) - timedelta(days=1)).strftime('%Y-%m-%d')
        last_month_start = (now.replace(day=1) - timedelta(days=now.day + 27)).replace(day=1).strftime('%Y-%m-%d')

        if prop_id:
            this_month = self.db.fetchone(
                'SELECT COALESCE(SUM(total_revenue), 0) as rev, COALESCE(SUM(total_bookings), 0) as bookings FROM daily_metrics WHERE property_id = ? AND date >= ?',
                (prop_id, this_month_start)
            )
            last_month = self.db.fetchone(
                'SELECT COALESCE(SUM(total_revenue), 0) as rev, COALESCE(SUM(total_bookings), 0) as bookings FROM daily_metrics WHERE property_id = ? AND date >= ? AND date <= ?',
                (prop_id, last_month_start, last_month_end)
            )
        else:
            this_month = self.db.fetchone(
                'SELECT COALESCE(SUM(total_revenue), 0) as rev, COALESCE(SUM(total_bookings), 0) as bookings FROM daily_metrics WHERE date >= ?',
                (this_month_start,)
            )
            last_month = self.db.fetchone(
                'SELECT COALESCE(SUM(total_revenue), 0) as rev, COALESCE(SUM(total_bookings), 0) as bookings FROM daily_metrics WHERE date >= ? AND date <= ?',
                (last_month_start, last_month_end)
            )

        this_rev = this_month['rev']
        last_rev = last_month['rev']
        rev_growth = ((this_rev - last_rev) / last_rev * 100) if last_rev > 0 else 0

        this_bookings = this_month['bookings']
        last_bookings = last_month['bookings']
        booking_growth = ((this_bookings - last_bookings) / last_bookings * 100) if last_bookings > 0 else 0

        return {
            'this_month_revenue': this_rev,
            'last_month_revenue': last_rev,
            'revenue_growth': round(rev_growth, 1),
            'this_month_bookings': this_bookings,
            'last_month_bookings': last_bookings,
            'booking_growth': round(booking_growth, 1),
        }

    def get_property_rankings(self):
        properties = self.get_active()
        rankings = []
        for p in properties:
            stats = self.get_stats(p['id'])
            today = self.get_today_stats(p['id'])
            growth = self.get_month_comparison(p['id'])
            rankings.append({
                'property': dict(p),
                'stats': stats,
                'today': today,
                'growth': growth,
            })
        rankings.sort(key=lambda x: x['stats']['total_revenue'], reverse=True)
        return rankings

    def record_daily_metrics(self, prop_id, date=None):
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        cursor = self.db.conn.cursor()
        revenue = cursor.execute(
            "SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE property_id = ? AND check_in_date = ?",
            (prop_id, date)
        ).fetchone()[0]
        bookings = cursor.execute(
            "SELECT COUNT(*) FROM bookings WHERE property_id = ? AND created_at LIKE ?",
            (prop_id, f"{date}%")
        ).fetchone()[0]
        checkins = cursor.execute(
            "SELECT COUNT(*) FROM bookings WHERE property_id = ? AND check_in_date = ? AND status = 'checkedin'",
            (prop_id, date)
        ).fetchone()[0]
        checkouts = cursor.execute(
            "SELECT COUNT(*) FROM bookings WHERE property_id = ? AND check_out_date = ? AND status = 'checkedout'",
            (prop_id, date)
        ).fetchone()[0]
        total_rooms = cursor.execute(
            "SELECT COUNT(*) FROM rooms WHERE property_id = ?", (prop_id,)
        ).fetchone()[0]
        occupied = cursor.execute(
            "SELECT COUNT(*) FROM rooms WHERE property_id = ? AND status = 'occupied'", (prop_id,)
        ).fetchone()[0]
        occ_rate = round((occupied / total_rooms * 100) if total_rooms > 0 else 0, 1)
        avg_rate = cursor.execute(
            "SELECT COALESCE(AVG(room_rate), 0) FROM bookings WHERE property_id = ? AND check_in_date = ?",
            (prop_id, date)
        ).fetchone()[0]
        new_guests = cursor.execute(
            "SELECT COUNT(*) FROM guests WHERE property_id = ? AND created_at LIKE ?",
            (prop_id, f"{date}%")
        ).fetchone()[0]
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT OR REPLACE INTO daily_metrics (property_id, date, total_revenue, total_bookings, check_ins, check_outs, occupancy_rate, avg_room_rate, new_guests, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
            (prop_id, date, revenue, bookings, checkins, checkouts, occ_rate, avg_rate, new_guests, now)
        )
