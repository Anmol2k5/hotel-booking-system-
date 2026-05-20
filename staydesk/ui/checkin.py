from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTableWidget, QTableWidgetItem,
                              QHeaderView, QSplitter, QFrame, QLineEdit,
                              QGroupBox, QFormLayout, QMessageBox, QScrollArea)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont
from datetime import datetime
from models.booking import BookingModel
from models.room import RoomModel


class CheckInPage(QWidget):
    def __init__(self, current_staff=None):
        super().__init__()
        self.booking_model = BookingModel()
        self.room_model = RoomModel()
        self.current_staff = current_staff
        self.selected_booking = None
        self.checked_in_ids = set()
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Check-In')
        title.setObjectName('title')
        header.addWidget(title)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Search by guest name or booking ref...')
        self.search_input.setFixedWidth(280)
        self.search_input.textChanged.connect(self.filter_bookings)
        header.addWidget(self.search_input)

        refresh_btn = QPushButton('Refresh')
        refresh_btn.setObjectName('btnSecondary')
        refresh_btn.clicked.connect(self.refresh)
        header.addWidget(refresh_btn)
        layout.addLayout(header)

        self.subtitle = QLabel('')
        self.subtitle.setObjectName('subtitle')
        layout.addWidget(self.subtitle)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)

        left_panel = self.build_table_panel()
        right_panel = self.build_detail_panel()
        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setSizes([550, 450])

        self.refresh()

    def build_table_panel(self):
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(['Ref', 'Guest', 'Room', 'Check-In', 'Source', 'Status'])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        self.table.cellClicked.connect(self.on_row_selected)
        layout.addWidget(self.table)

        return panel

    def build_detail_panel(self):
        panel = QScrollArea()
        panel.setWidgetResizable(True)
        panel.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.detail_container = QWidget()
        self.detail_layout = QVBoxLayout(self.detail_container)
        self.detail_layout.setContentsMargins(16, 16, 16, 16)
        self.detail_layout.setSpacing(12)

        self.empty_label = QLabel('Select a booking to view details')
        self.empty_label.setObjectName('subtitle')
        self.empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.detail_layout.addWidget(self.empty_label)
        self.detail_layout.addStretch()

        panel.setWidget(self.detail_container)
        return panel

    def refresh(self):
        self.bookings = self.booking_model.get_today_checkins()
        self.subtitle.setText(f"{len(self.bookings)} arrival(s) scheduled for today")
        self.populate_table(self.bookings)

    def populate_table(self, bookings):
        self.table.setRowCount(len(bookings))
        for i, b in enumerate(bookings):
            is_done = b['id'] in self.checked_in_ids

            ref_item = QTableWidgetItem(b['booking_ref'])
            if is_done:
                ref_item.setForeground(Qt.GlobalColor.darkGreen)
            self.table.setItem(i, 0, ref_item)

            self.table.setItem(i, 1, QTableWidgetItem(b['guest_name']))
            self.table.setItem(i, 2, QTableWidgetItem(b['room_id'][-3:] if b['room_id'] else ''))
            self.table.setItem(i, 3, QTableWidgetItem(b['check_in_date'][:10]))
            self.table.setItem(i, 4, QTableWidgetItem(b['source'] or 'Direct'))

            if is_done:
                status_item = QTableWidgetItem('\u2713 Checked In')
                status_item.setForeground(Qt.GlobalColor.darkGreen)
            else:
                status_item = QTableWidgetItem('Pending')
            self.table.setItem(i, 5, status_item)

    def filter_bookings(self, text):
        if not text:
            self.populate_table(self.bookings)
            return
        filtered = [b for b in self.bookings
                    if text.lower() in b['booking_ref'].lower()
                    or text.lower() in (b['guest_name'] or '').lower()]
        self.populate_table(filtered)

    def on_row_selected(self, row, col):
        if row >= len(self.bookings):
            return
        self.selected_booking = self.bookings[row]
        self.show_detail(self.selected_booking)

    def show_detail(self, booking):
        while self.detail_layout.count():
            item = self.detail_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        is_done = booking['id'] in self.checked_in_ids

        name_label = QLabel(booking['guest_name'])
        name_label.setStyleSheet("font-size: 20px; font-weight: 700; color: #ffffff;")
        self.detail_layout.addWidget(name_label)

        ref_label = QLabel(f"Booking: {booking['booking_ref']}")
        ref_label.setStyleSheet("font-size: 12px; color: #71717a; font-family: monospace;")
        self.detail_layout.addWidget(ref_label)

        sep = QFrame()
        sep.setObjectName('separator')
        sep.setFixedHeight(1)
        self.detail_layout.addWidget(sep)

        info = QGroupBox('Guest & Booking Details')
        info_layout = QFormLayout(info)
        info_layout.addRow('Phone:', QLabel(booking['guest_phone'] or '-'))
        info_layout.addRow('Email:', QLabel(booking['guest_email'] or '-'))
        info_layout.addRow('Check-In:', QLabel(booking['check_in_date'][:10]))
        info_layout.addRow('Check-Out:', QLabel(booking['check_out_date'][:10]))

        ci = datetime.fromisoformat(booking['check_in_date'])
        co = datetime.fromisoformat(booking['check_out_date'])
        nights = max(1, (co - ci).days)
        info_layout.addRow('Duration:', QLabel(f"{nights} night(s)"))
        info_layout.addRow('Adults:', QLabel(str(booking['adults'])))
        info_layout.addRow('Children:', QLabel(str(booking['children'])))
        info_layout.addRow('Room Rate:', QLabel(f"\u20b9{booking['room_rate']:,}/night"))
        info_layout.addRow('Total Amount:', QLabel(f"\u20b9{booking['total_amount']:,.0f}"))
        info_layout.addRow('Source:', QLabel(booking['source'] or 'Direct'))
        info_layout.addRow('Status:', QLabel(booking['status'].upper()))
        self.detail_layout.addWidget(info)

        room_info = QGroupBox('Room Information')
        room_layout = QFormLayout(room_info)
        if booking['room_id']:
            room = self.room_model.get_by_id(booking['room_id'])
            if room:
                room_layout.addRow('Room:', QLabel(f"Room {room['number']}"))
                room_layout.addRow('Type:', QLabel(room['type_name']))
                room_layout.addRow('Floor:', QLabel(str(room['floor'])))
                room_layout.addRow('Current Status:', QLabel(room['status'].upper()))
        self.detail_layout.addWidget(room_info)

        self.detail_layout.addStretch()

        if not is_done:
            checkin_btn = QPushButton('Confirm Check-In')
            checkin_btn.setObjectName('btnSuccess')
            checkin_btn.setFixedHeight(44)
            checkin_btn.clicked.connect(lambda: self.perform_checkin(booking))
            self.detail_layout.addWidget(checkin_btn)
        else:
            done_label = QLabel('\u2713 Guest Checked In Successfully')
            done_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #10b981; text-align: center; padding: 12px;")
            done_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.detail_layout.addWidget(done_label)

    def perform_checkin(self, booking):
        try:
            self.booking_model.update_status(booking['id'], 'checkedin')
            if booking['room_id']:
                self.room_model.update_status(booking['room_id'], 'occupied', f"Check-in: {booking['booking_ref']}")
            self.checked_in_ids.add(booking['id'])
            QMessageBox.information(self, 'Check-In Successful',
                                    f"{booking['guest_name']} has been checked into Room {booking['room_id'][-3:] if booking['room_id'] else 'N/A'}")
            self.refresh()
            if self.selected_booking and self.selected_booking['id'] == booking['id']:
                self.selected_booking = self.booking_model.get_by_id(booking['id'])
                if self.selected_booking:
                    self.show_detail(dict(self.selected_booking))
        except Exception as e:
            QMessageBox.warning(self, 'Error', str(e))
