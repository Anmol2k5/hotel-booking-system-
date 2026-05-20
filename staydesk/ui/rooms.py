from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QGridLayout, QFrame, QPushButton, QComboBox,
                              QDialog, QLineEdit, QMessageBox, QScrollArea,
                              QTableWidget, QTableWidgetItem, QHeaderView)
from PyQt6.QtCore import Qt, pyqtSignal, QTimer
from models.room import RoomModel

STATUS_COLORS = {
    'available': ('#34d399', '#064e3b'),
    'occupied': ('#60a5fa', '#1e3a5f'),
    'checkout': ('#fbbf24', '#451a03'),
    'maintenance': ('#f87171', '#450a0a'),
    'reserved': ('#c084fc', '#3b0764'),
}


class RoomCard(QFrame):
    status_changed = pyqtSignal(str, str)

    def __init__(self, room, parent=None):
        super().__init__(parent)
        self.room = room
        self.setObjectName('card')
        self.setFixedHeight(140)
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
        color, bg = STATUS_COLORS.get(status, ('#a1a1aa', '#2a2d3a'))
        badge = QLabel(status.upper())
        badge.setStyleSheet(f"background-color: {bg}; color: {color}; border-radius: 12px; padding: 4px 10px; font-size: 10px; font-weight: 600;")
        top_row.addStretch()
        top_row.addWidget(badge)
        layout.addLayout(top_row)

        type_label = QLabel(f"{self.room['type_name']} - Floor {self.room['floor']}")
        type_label.setStyleSheet("font-size: 12px; color: #71717a;")
        layout.addWidget(type_label)

        rate_label = QLabel(f"\u20b9{self.room['rate']:,} / night")
        rate_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #10b981;")
        layout.addWidget(rate_label)

        layout.addStretch()

        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(6)

        if self.room['status'] == 'available':
            btn = QPushButton('Check In')
            btn.setObjectName('btnSuccess')
            btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'occupied'))
        elif self.room['status'] == 'occupied':
            btn = QPushButton('Check Out')
            btn.setObjectName('btnWarning')
            btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'checkout'))
        elif self.room['status'] == 'checkout':
            btn = QPushButton('Mark Clean')
            btn.setObjectName('btnSuccess')
            btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'available'))
        elif self.room['status'] == 'maintenance':
            btn = QPushButton('Ready')
            btn.setObjectName('btnSuccess')
            btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'available'))
        else:
            btn = QPushButton('Set Available')
            btn.setObjectName('btnSecondary')
            btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'available'))

        btn_layout.addWidget(btn)

        history_btn = QPushButton('History')
        history_btn.setObjectName('btnSecondary')
        history_btn.setFixedWidth(65)
        history_btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'history'))
        btn_layout.addWidget(history_btn)

        maint_btn = QPushButton('Maint.')
        maint_btn.setObjectName('btnDanger')
        maint_btn.setFixedWidth(60)
        maint_btn.clicked.connect(lambda: self.status_changed.emit(self.room['id'], 'maintenance'))
        btn_layout.addWidget(maint_btn)

        layout.addLayout(btn_layout)


class RoomsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.room_model = RoomModel()
        self.filter_status = 'all'
        self.init_ui()
        self.start_auto_refresh()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Room Management')
        title.setObjectName('title')
        header.addWidget(title)

        self.filter_combo = QComboBox()
        self.filter_combo.addItems(['All Rooms', 'Available', 'Occupied', 'Checkout', 'Maintenance', 'Reserved'])
        self.filter_combo.setFixedWidth(160)
        self.filter_combo.currentIndexChanged.connect(self.on_filter_changed)
        header.addStretch()
        header.addWidget(self.filter_combo)

        add_btn = QPushButton('+ Add Room')
        add_btn.clicked.connect(self.add_room_dialog)
        header.addWidget(add_btn)
        layout.addLayout(header)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        layout.addWidget(self.scroll)

        self.grid_container = QWidget()
        self.grid_layout = QGridLayout(self.grid_container)
        self.grid_layout.setSpacing(16)
        self.grid_layout.setContentsMargins(0, 0, 0, 0)
        self.scroll.setWidget(self.grid_container)

        self.refresh()

    def refresh(self):
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if self.filter_status == 'all':
            rooms = self.room_model.get_all()
        else:
            rooms = self.room_model.get_by_status(self.filter_status)

        for i, room in enumerate(rooms):
            row = i // 4
            col = i % 4
            card = RoomCard(dict(room))
            card.status_changed.connect(self.on_status_changed)
            self.grid_layout.addWidget(card, row, col)

    def on_filter_changed(self, index):
        statuses = ['all', 'available', 'occupied', 'checkout', 'maintenance', 'reserved']
        self.filter_status = statuses[index]
        self.refresh()

    def on_status_changed(self, room_id, new_status):
        if new_status == 'history':
            self.show_status_history(room_id)
            return
        self.room_model.update_status(room_id, new_status)
        self.refresh()

    def show_status_history(self, room_id):
        history = self.room_model.get_status_history(room_id)
        room = self.room_model.get_by_id(room_id)

        dialog = QDialog(self)
        dialog.setWindowTitle(f"Status History - Room {room['number']}")
        dialog.setFixedSize(500, 400)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)

        table = QTableWidget()
        table.setColumnCount(5)
        table.setHorizontalHeaderLabels(['Time', 'Old Status', 'New Status', 'Reason', ''])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.verticalHeader().setVisible(False)
        table.setRowCount(len(history))

        for i, h in enumerate(history):
            table.setItem(i, 0, QTableWidgetItem(h['changed_at'][:19].replace('T', ' ')))
            table.setItem(i, 1, QTableWidgetItem(h['old_status'].upper()))
            table.setItem(i, 2, QTableWidgetItem(h['new_status'].upper()))
            table.setItem(i, 3, QTableWidgetItem(h['reason'] or '-'))

        layout.addWidget(table)
        dialog.exec()

    def add_room_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add New Room')
        dialog.setFixedSize(350, 300)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(12)

        fields = [
            ('Room Number', 'number'),
            ('Floor', 'floor'),
            ('Type Name', 'type_name'),
            ('Rate per Night', 'rate'),
        ]
        inputs = {}
        for label_text, key in fields:
            lbl = QLabel(label_text)
            lbl.setStyleSheet("font-size: 12px; color: #a1a1aa;")
            layout.addWidget(lbl)
            inp = QLineEdit()
            inputs[key] = inp
            layout.addWidget(inp)

        def save():
            try:
                number = inputs['number'].text().strip()
                floor = int(inputs['floor'].text().strip())
                type_name = inputs['type_name'].text().strip()
                rate = float(inputs['rate'].text().strip())
                if not number or not type_name:
                    QMessageBox.warning(dialog, 'Error', 'All fields are required')
                    return
                self.room_model.add(number, floor, type_name, rate)
                self.refresh()
                dialog.accept()
            except ValueError as e:
                QMessageBox.warning(dialog, 'Error', f'Invalid input: {e}')

        btn = QPushButton('Save Room')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()

    def start_auto_refresh(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.refresh)
        self.timer.start(10000)
