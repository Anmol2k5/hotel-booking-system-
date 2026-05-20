import uuid
from datetime import datetime
from database.db import Database


class HousekeepingModel:
    def __init__(self):
        self.db = Database()

    def get_dirty_rooms(self):
        return self.db.fetchall(
            "SELECT r.*, g.first_name, g.last_name FROM rooms r "
            "LEFT JOIN bookings b ON r.id = b.room_id AND b.status = 'checkedout' "
            "LEFT JOIN guests g ON b.guest_id = g.id "
            "WHERE r.status IN ('checkout', 'maintenance') ORDER BY CAST(r.number AS INTEGER)"
        )

    def get_in_progress(self):
        return self.db.fetchall(
            "SELECT hl.*, r.number, r.type_name, s.username as staff_name "
            "FROM housekeeping_logs hl "
            "JOIN rooms r ON hl.room_id = r.id "
            "JOIN staff_profiles s ON hl.staff_id = s.id "
            "WHERE hl.status = 'in_progress' ORDER BY hl.started_at"
        )

    def get_completed_today(self):
        today = datetime.now().strftime('%Y-%m-%d')
        return self.db.fetchall(
            "SELECT hl.*, r.number, r.type_name, s.username as staff_name "
            "FROM housekeeping_logs hl "
            "JOIN rooms r ON hl.room_id = r.id "
            "JOIN staff_profiles s ON hl.staff_id = s.id "
            "WHERE hl.status = 'completed' AND hl.completed_at >= ? ORDER BY hl.completed_at DESC",
            (today,)
        )

    def get_logs_by_staff(self, staff_id):
        return self.db.fetchall(
            "SELECT hl.*, r.number, r.type_name FROM housekeeping_logs hl "
            "JOIN rooms r ON hl.room_id = r.id "
            "WHERE hl.staff_id = ? ORDER BY hl.started_at DESC",
            (staff_id,)
        )

    def assign_task(self, room_id, staff_id):
        log_id = f"hk-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        self.db.execute(
            'INSERT INTO housekeeping_logs (id, room_id, staff_id, started_at, status, commission_earned) VALUES (?,?,?,?,?,?)',
            (log_id, room_id, staff_id, now, 'in_progress', 0)
        )
        self.db.execute('UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?', ('maintenance', now, room_id))
        return log_id

    def complete_task(self, room_id, staff_id):
        now = datetime.now().isoformat()
        cleaning_comm = float(self.db.fetchone(
            "SELECT cleaning_commission FROM staff_profiles WHERE id = ?", (staff_id,)
        )['cleaning_commission'] or 0)

        self.db.execute(
            "UPDATE housekeeping_logs SET completed_at = ?, status = 'completed', commission_earned = ? "
            "WHERE room_id = ? AND staff_id = ? AND status = 'in_progress'",
            (now, cleaning_comm, room_id, staff_id)
        )
        self.db.execute('UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?', ('available', now, room_id))
        if cleaning_comm > 0:
            self.db.execute(
                'UPDATE staff_profiles SET earned_commission = earned_commission + ? WHERE id = ?',
                (cleaning_comm, staff_id)
            )

    def report_issue(self, room_id):
        now = datetime.now().isoformat()
        self.db.execute('UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?', ('maintenance', now, room_id))
