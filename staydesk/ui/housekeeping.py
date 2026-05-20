from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QGridLayout, QFrame, QPushButton, QScrollArea,
                              QDialog, QMessageBox, QTabWidget)
from PyQt6.QtCore import Qt, pyqtSignal
from models.housekeeping import HousekeepingModel
from models.staff import StaffModel
from models.room import RoomModel


class HousekeepingCard(QFrame):
    action_clicked = pyqtSignal(str, str)

    def __init__(self, room, parent=None):
        super().__init__(parent)
        self.room = room
        self.setObjectName('card')
        self.setFixedHeight(150)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(8)

        top_row = QHBoxLayout()
        room_num = QLabel(f"Room {self.room['number']}")
        room_num.setStyleSheet("font-size: 18px; font-weight: 700; color: #ffffff; font-family: monospace;")
        top_row.addWidget(room_num)

        status = self.room['status']
        color = '#fbbf24' if status == 'checkout' else '#f87171'
        bg = '#451a03' if status == 'checkout' else '#450a0a'
        badge = QLabel(status.upper())
        badge.setStyleSheet(f"background-color: {bg}; color: {color}; border-radius: 12px; padding: 4px 10px; font-size: 10px; font-weight: 600;")
        top_row.addStretch()
        top_row.addWidget(badge)
        layout.addLayout(top_row)

        type_label = QLabel(f"{self.room['type_name']}")
        type_label.setStyleSheet("font-size: 12px; color: #71717a;")
        layout.addWidget(type_label)

        if self.room.get('first_name'):
            guest_label = QLabel(f"Last guest: {self.room['first_name']} {self.room.get('last_name', '')}")
            guest_label.setStyleSheet("font-size: 11px; color: #52525b;")
            layout.addWidget(guest_label)

        layout.addStretch()

        start_btn = QPushButton('Start Cleaning')
        start_btn.setObjectName('btnSuccess')
        start_btn.clicked.connect(lambda: self.action_clicked.emit(self.room['id'], 'start'))
        layout.addWidget(start_btn)


class InProgressCard(QFrame):
    def __init__(self, log, parent=None):
        super().__init__(parent)
        self.log = log
        self.setObjectName('card')
        self.setFixedHeight(100)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(6)

        top_row = QHBoxLayout()
        room_num = QLabel(f"Room {self.log['number']}")
        room_num.setStyleSheet("font-size: 16px; font-weight: 700; color: #ffffff; font-family: monospace;")
        top_row.addWidget(room_num)

        badge = QLabel('CLEANING')
        badge.setStyleSheet("background-color: #1e3a5f; color: #60a5fa; border-radius: 12px; padding: 4px 10px; font-size: 10px; font-weight: 600;")
        top_row.addStretch()
        top_row.addWidget(badge)
        layout.addLayout(top_row)

        staff_label = QLabel(f"Cleaner: {self.log['staff_name']}")
        staff_label.setStyleSheet("font-size: 12px; color: #71717a;")
        layout.addWidget(staff_label)

        started = self.log['started_at'][:16].replace('T', ' ')
        time_label = QLabel(f"Started: {started}")
        time_label.setStyleSheet("font-size: 11px; color: #52525b;")
        layout.addWidget(time_label)


class HousekeepingPage(QWidget):
    def __init__(self, current_staff=None):
        super().__init__()
        self.hk_model = HousekeepingModel()
        self.staff_model = StaffModel()
        self.room_model = RoomModel()
        self.current_staff = current_staff
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Housekeeping Queue')
        title.setObjectName('title')
        header.addWidget(title)

        if self.current_staff:
            earnings = self.current_staff.get('earned_commission', 0)
            earnings_label = QLabel(f"Today's Earnings: \u20b9{earnings:,.0f}")
            earnings_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #10b981;")
            header.addStretch()
            header.addWidget(earnings_label)

        self.refresh_btn = QPushButton('Refresh')
        self.refresh_btn.setObjectName('btnSecondary')
        self.refresh_btn.clicked.connect(self.refresh)
        header.addWidget(self.refresh_btn)
        layout.addLayout(header)

        self.tabs = QTabWidget()
        layout.addWidget(self.tabs)

        self.dirty_tab = QScrollArea()
        self.dirty_tab.setWidgetResizable(True)
        self.dirty_tab.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.dirty_container = QWidget()
        self.dirty_layout = QGridLayout(self.dirty_container)
        self.dirty_layout.setSpacing(16)
        self.dirty_layout.setContentsMargins(0, 0, 0, 0)
        self.dirty_tab.setWidget(self.dirty_container)

        self.progress_tab = QScrollArea()
        self.progress_tab.setWidgetResizable(True)
        self.progress_tab.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.progress_container = QWidget()
        self.progress_layout = QVBoxLayout(self.progress_container)
        self.progress_layout.setSpacing(12)
        self.progress_layout.setContentsMargins(0, 0, 0, 0)
        self.progress_tab.setWidget(self.progress_container)

        self.completed_tab = QScrollArea()
        self.completed_tab.setWidgetResizable(True)
        self.completed_tab.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.completed_container = QWidget()
        self.completed_layout = QVBoxLayout(self.completed_container)
        self.completed_layout.setSpacing(12)
        self.completed_layout.setContentsMargins(0, 0, 0, 0)
        self.completed_tab.setWidget(self.completed_container)

        self.tabs.addTab(self.dirty_tab, 'Dirty Rooms')
        self.tabs.addTab(self.progress_tab, 'In Progress')
        self.tabs.addTab(self.completed_tab, 'Completed Today')

        self.refresh()

    def refresh(self):
        while self.dirty_layout.count():
            item = self.dirty_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        while self.progress_layout.count():
            item = self.progress_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        while self.completed_layout.count():
            item = self.completed_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        dirty_rooms = self.hk_model.get_dirty_rooms()
        for i, room in enumerate(dirty_rooms):
            row = i // 3
            col = i % 3
            card = HousekeepingCard(dict(room))
            card.action_clicked.connect(self.on_start_cleaning)
            self.dirty_layout.addWidget(card, row, col)

        in_progress = self.hk_model.get_in_progress()
        for log in in_progress:
            card = InProgressCard(dict(log))
            complete_btn = QPushButton('Mark Complete')
            complete_btn.setObjectName('btnSuccess')
            complete_btn.setFixedWidth(120)
            complete_btn.clicked.connect(lambda checked, lid=dict(log): self.on_complete(lid))
            card_layout = card.layout()
            btn_row = QHBoxLayout()
            btn_row.addStretch()
            btn_row.addWidget(complete_btn)
            card_layout.addLayout(btn_row)
            self.progress_layout.addWidget(card)

        completed = self.hk_model.get_completed_today()
        for log in completed:
            lbl = QLabel(f"Room {log['number']} - Cleaned by {log['staff_name']} - Commission: \u20b9{log['commission_earned']:,.0f}")
            lbl.setStyleSheet("font-size: 13px; color: #a1a1aa; padding: 8px;")
            self.completed_layout.addWidget(lbl)

        self.tabs.setTabText(0, f"Dirty Rooms ({len(dirty_rooms)})")
        self.tabs.setTabText(1, f"In Progress ({len(in_progress)})")
        self.tabs.setTabText(2, f"Completed ({len(completed)})")

    def on_start_cleaning(self, room_id, action):
        if not self.current_staff:
            staff_list = self.staff_model.get_by_role('housekeeping')
            if not staff_list:
                QMessageBox.warning(self, 'Error', 'No housekeeping staff found')
                return
            dialog = QDialog(self)
            dialog.setWindowTitle('Assign Cleaner')
            dialog.setFixedSize(300, 200)
            dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')
            d_layout = QVBoxLayout(dialog)
            from PyQt6.QtWidgets import QComboBox
            combo = QComboBox()
            for s in staff_list:
                combo.addItem(s['username'], s['id'])
            d_layout.addWidget(combo)
            def assign():
                staff_id = combo.currentData()
                self.hk_model.assign_task(room_id, staff_id)
                self.refresh()
                dialog.accept()
            btn = QPushButton('Assign')
            btn.clicked.connect(assign)
            d_layout.addWidget(btn)
            dialog.exec()
        else:
            self.hk_model.assign_task(room_id, self.current_staff['id'])
            self.refresh()

    def on_complete(self, log):
        self.hk_model.complete_task(log['room_id'], log['staff_id'])
        if self.current_staff and self.current_staff['id'] == log['staff_id']:
            staff = self.staff_model.get_by_id(self.current_staff['id'])
            if staff:
                self.current_staff = dict(staff)
        self.refresh()
