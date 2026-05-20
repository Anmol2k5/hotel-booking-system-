from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QGridLayout, QFrame, QPushButton, QScrollArea,
                              QTableWidget, QTableWidgetItem, QHeaderView)
from PyQt6.QtCore import Qt, QTimer
from datetime import datetime
from models.room import RoomModel
from models.booking import BookingModel
from models.guest import GuestModel

STATUS_BORDER = {
    'available': '#34d399',
    'occupied': '#60a5fa',
    'checkout': '#fbbf24',
    'maintenance': '#f87171',
    'reserved': '#c084fc',
}

STATUS_BG = {
    'available': '#064e3b',
    'occupied': '#1e3a5f',
    'checkout': '#451a03',
    'maintenance': '#450a0a',
    'reserved': '#3b0764',
}


class RoomGridCard(QFrame):
    def __init__(self, room):
        super().__init__()
        self.room = room
        self.setObjectName('card')
        self.setFixedHeight(70)
        self.init_ui()

    def init_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(10)

        color = STATUS_BORDER.get(self.room['status'], '#a1a1aa')
        self.setStyleSheet(f"""
            QFrame#card {{
                background-color: #1a1d2e;
                border: 1px solid #2a2d3a;
                border-left: 4px solid {color};
                border-radius: 8px;
            }}
        """)

        room_num = QLabel(f"{self.room['number']}")
        room_num.setStyleSheet("font-size: 16px; font-weight: 700; color: #ffffff; font-family: monospace;")
        layout.addWidget(room_num)

        type_lbl = QLabel(self.room['type_name'])
        type_lbl.setStyleSheet("font-size: 11px; color: #71717a;")
        layout.addWidget(type_lbl)

        layout.addStretch()

        bg = STATUS_BG.get(self.room['status'], '#2a2d3a')
        badge = QLabel(self.room['status'].upper())
        badge.setStyleSheet(f"background-color: {bg}; color: {color}; border-radius: 10px; padding: 3px 8px; font-size: 9px; font-weight: 600;")
        layout.addWidget(badge)


class DashboardPage(QWidget):
    def __init__(self):
        super().__init__()
        self.room_model = RoomModel()
        self.booking_model = BookingModel()
        self.guest_model = GuestModel()
        self.init_ui()
        self.start_auto_refresh()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Dashboard')
        title.setObjectName('title')
        header.addWidget(title)

        now = datetime.now().strftime('%B %d, %Y')
        date_label = QLabel(now)
        date_label.setObjectName('subtitle')
        date_label.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        header.addStretch()
        header.addWidget(date_label)

        new_btn = QPushButton('+ New Booking')
        new_btn.setObjectName('btnSuccess')
        header.addWidget(new_btn)
        layout.addLayout(header)

        self.stats_grid = QGridLayout()
        self.stats_grid.setSpacing(12)
        layout.addLayout(self.stats_grid)

        legend = QHBoxLayout()
        legend.setSpacing(16)
        for status, color in STATUS_BORDER.items():
            dot = QLabel('  ')
            dot.setStyleSheet(f"background-color: {color}; border-radius: 6px; min-width: 12px; min-height: 12px; max-width: 12px; max-height: 12px;")
            legend.addWidget(dot)
            lbl = QLabel(status.capitalize())
            lbl.setStyleSheet("font-size: 11px; color: #71717a;")
            legend.addWidget(lbl)
        legend.addStretch()
        layout.addLayout(legend)

        self.room_scroll = QScrollArea()
        self.room_scroll.setWidgetResizable(True)
        self.room_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.room_scroll.setFixedHeight(280)
        layout.addWidget(self.room_scroll)

        self.room_grid_container = QWidget()
        self.room_grid_layout = QGridLayout(self.room_grid_container)
        self.room_grid_layout.setSpacing(8)
        self.room_grid_layout.setContentsMargins(0, 0, 0, 0)
        self.room_scroll.setWidget(self.room_grid_container)

        tables_layout = QHBoxLayout()
        tables_layout.setSpacing(16)

        self.checkins_table = self.build_mini_table("Today's Check-ins", ['Ref', 'Guest', 'Room', 'Source'])
        self.checkouts_table = self.build_mini_table("Today's Check-outs", ['Ref', 'Guest', 'Room', 'Nights'])
        tables_layout.addWidget(self.checkins_table)
        tables_layout.addWidget(self.checkouts_table)
        layout.addLayout(tables_layout)

        self.refresh()

    def build_mini_table(self, title, headers):
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        title_label = QLabel(title)
        title_label.setObjectName('sectionTitle')
        layout.addWidget(title_label)

        table = QTableWidget()
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.verticalHeader().setVisible(False)
        table.setAlternatingRowColors(True)
        table.setMaximumHeight(150)
        layout.addWidget(table)

        return table

    def create_stat_card(self, value, label, color='#2563eb'):
        card = QFrame()
        card.setObjectName('statCard')
        card.setFixedHeight(80)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(16, 10, 16, 10)
        card_layout.setSpacing(2)

        val_label = QLabel(str(value))
        val_label.setStyleSheet(f"font-size: 22px; font-weight: 700; color: {color};")
        card_layout.addWidget(val_label)

        lbl = QLabel(label)
        lbl.setStyleSheet("font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;")
        card_layout.addWidget(lbl)

        return card

    def refresh(self):
        while self.stats_grid.count():
            item = self.stats_grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        stats = self.room_model.get_stats()
        revenue = self.booking_model.get_revenue_stats()
        checkins = self.booking_model.get_today_checkins()
        checkouts = self.booking_model.get_today_checkouts()
        total_guests = len(self.guest_model.get_all())

        currency = '\u20b9'
        cards = [
            (stats['total'], 'Total Rooms', '#ffffff'),
            (stats['available'], 'Available', '#34d399'),
            (stats['occupied'], 'Occupied', '#60a5fa'),
            (stats['checkout'], 'Checkout / Dirty', '#fbbf24'),
            (stats['maintenance'], 'Maintenance', '#f87171'),
            (stats['reserved'], 'Reserved', '#c084fc'),
            (len(checkins), 'Today Check-ins', '#3b82f6'),
            (len(checkouts), 'Today Check-outs', '#f59e0b'),
            (f"{currency}{revenue['today']:,.0f}", "Today's Revenue", '#10b981'),
            (total_guests, 'Total Guests', '#8b5cf6'),
        ]

        for i, (value, label, color) in enumerate(cards):
            row = i // 5
            col = i % 5
            self.stats_grid.addWidget(self.create_stat_card(value, label, color), row, col)

        while self.room_grid_layout.count():
            item = self.room_grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        rooms = self.room_model.get_all()
        for i, room in enumerate(rooms):
            row = i // 6
            col = i % 6
            self.room_grid_layout.addWidget(RoomGridCard(dict(room)), row, col)

        self.checkins_table.setRowCount(len(checkins))
        for i, b in enumerate(checkins):
            self.checkins_table.setItem(i, 0, QTableWidgetItem(b['booking_ref']))
            self.checkins_table.setItem(i, 1, QTableWidgetItem(b['guest_name']))
            self.checkins_table.setItem(i, 2, QTableWidgetItem(b['room_id'][-3:] if b['room_id'] else ''))
            self.checkins_table.setItem(i, 3, QTableWidgetItem(b['source'] or 'Direct'))

        self.checkouts_table.setRowCount(len(checkouts))
        for i, b in enumerate(checkouts):
            ci = datetime.fromisoformat(b['check_in_date'])
            co = datetime.fromisoformat(b['check_out_date'])
            nights = max(1, (co - ci).days)
            self.checkouts_table.setItem(i, 0, QTableWidgetItem(b['booking_ref']))
            self.checkouts_table.setItem(i, 1, QTableWidgetItem(b['guest_name']))
            self.checkouts_table.setItem(i, 2, QTableWidgetItem(b['room_id'][-3:] if b['room_id'] else ''))
            self.checkouts_table.setItem(i, 3, QTableWidgetItem(f"{nights}"))

    def start_auto_refresh(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.refresh)
        self.timer.start(15000)
