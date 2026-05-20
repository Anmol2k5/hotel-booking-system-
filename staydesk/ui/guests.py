from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTableWidget, QTableWidgetItem,
                              QHeaderView, QDialog, QLineEdit, QComboBox,
                              QMessageBox, QGroupBox, QFormLayout, QSpinBox,
                              QScrollArea, QGridLayout, QFrame)
from PyQt6.QtCore import Qt
from models.guest import GuestModel


class GuestCard(QFrame):
    def __init__(self, guest, parent=None):
        super().__init__(parent)
        self.guest = guest
        self.setObjectName('card')
        self.setFixedHeight(160)
        self.init_ui()

    def init_ui(self):
        is_vip = self.guest['vip']
        border_color = '#d4a017' if is_vip else '#2a2d3a'
        self.setStyleSheet(f"""
            QFrame#card {{
                background-color: #1a1d2e;
                border: {'2px' if is_vip else '1px'} solid {border_color};
                border-radius: 12px;
            }}
            QFrame#card:hover {{
                border-color: {'#d4a017' if is_vip else '#3b82f6'};
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(6)

        top_row = QHBoxLayout()
        initial = (self.guest['first_name'] or '?')[0].upper()
        avatar = QLabel(initial)
        avatar.setStyleSheet(f"""
            background-color: {'#d4a017' if is_vip else '#2563eb'};
            color: #ffffff;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            min-width: 32px;
            max-width: 32px;
            min-height: 32px;
            max-height: 32px;
            text-align: center;
        """)
        avatar.setAlignment(Qt.AlignmentFlag.AlignCenter)
        top_row.addWidget(avatar)

        name = QLabel(f"{self.guest['first_name']} {self.guest['last_name']}")
        name.setStyleSheet("font-size: 14px; font-weight: 600; color: #ffffff;")
        top_row.addWidget(name)

        if is_vip:
            vip_badge = QLabel('VIP')
            vip_badge.setStyleSheet("background-color: #451a03; color: #fbbf24; border-radius: 8px; padding: 2px 8px; font-size: 9px; font-weight: 700;")
            top_row.addWidget(vip_badge)

        top_row.addStretch()
        layout.addLayout(top_row)

        city = self.guest.get('city', '')
        if city:
            city_lbl = QLabel(f"\U0001f4cd {city}")
            city_lbl.setStyleSheet("font-size: 11px; color: #71717a;")
            layout.addWidget(city_lbl)

        phone = self.guest.get('phone', '')
        if phone:
            phone_lbl = QLabel(f"\U0001f4de {phone}")
            phone_lbl.setStyleSheet("font-size: 11px; color: #a1a1aa;")
            layout.addWidget(phone_lbl)

        email = self.guest.get('email', '')
        if email:
            email_lbl = QLabel(f"\u2709 {email}")
            email_lbl.setStyleSheet("font-size: 11px; color: #a1a1aa;")
            layout.addWidget(email_lbl)

        layout.addStretch()

        bottom_row = QHBoxLayout()
        stays_lbl = QLabel(f"{self.guest['total_stays']} stays")
        stays_lbl.setStyleSheet("font-size: 10px; color: #71717a;")
        bottom_row.addWidget(stays_lbl)

        spent_lbl = QLabel(f"\u20b9{self.guest['total_spent']:,.0f}")
        spent_lbl.setStyleSheet("font-size: 12px; font-weight: 600; color: #10b981;")
        bottom_row.addStretch()
        bottom_row.addWidget(spent_lbl)
        layout.addLayout(bottom_row)


class GuestsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.guest_model = GuestModel()
        self.view_mode = 'grid'
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Guests')
        title.setObjectName('title')
        header.addWidget(title)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Search guests...')
        self.search_input.setFixedWidth(250)
        self.search_input.textChanged.connect(self.filter_guests)
        header.addWidget(self.search_input)

        view_toggle = QPushButton('Table View' if self.view_mode == 'grid' else 'Grid View')
        view_toggle.setObjectName('btnSecondary')
        view_toggle.setFixedWidth(100)
        view_toggle.clicked.connect(self.toggle_view)
        header.addWidget(view_toggle)

        new_btn = QPushButton('+ Add Guest')
        new_btn.clicked.connect(self.add_guest_dialog)
        header.addWidget(new_btn)
        layout.addLayout(header)

        self.stack_content = QWidget()
        self.stack_layout = QVBoxLayout(self.stack_content)
        self.stack_layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.stack_content)

        self.refresh()

    def toggle_view(self):
        self.view_mode = 'table' if self.view_mode == 'grid' else 'grid'
        self.refresh()

    def refresh(self, guests=None):
        if guests is None:
            guests = self.guest_model.get_all()

        while self.stack_layout.count():
            item = self.stack_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if self.view_mode == 'grid':
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
            container = QWidget()
            grid = QGridLayout(container)
            grid.setSpacing(16)
            grid.setContentsMargins(0, 0, 0, 0)
            for i, g in enumerate(guests):
                row = i // 4
                col = i % 4
                card = GuestCard(dict(g))
                edit_btn = QPushButton('Edit')
                edit_btn.setObjectName('btnSecondary')
                edit_btn.setFixedWidth(60)
                edit_btn.clicked.connect(lambda checked, gid=g['id']: self.edit_guest_dialog(gid))
                card.layout().addWidget(edit_btn)
                grid.addWidget(card, row, col)
            scroll.setWidget(container)
            self.stack_layout.addWidget(scroll)
        else:
            self.table = QTableWidget()
            self.table.setColumnCount(8)
            self.table.setHorizontalHeaderLabels(['Name', 'Phone', 'Email', 'City', 'VIP', 'Stays', 'Total Spent', 'Actions'])
            self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
            self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
            self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
            self.table.verticalHeader().setVisible(False)
            self.table.setAlternatingRowColors(True)
            self.table.setRowCount(len(guests))
            for i, g in enumerate(guests):
                name_item = QTableWidgetItem(f"{g['first_name']} {g['last_name']}")
                if g['vip']:
                    name_item.setForeground(Qt.GlobalColor.darkYellow)
                self.table.setItem(i, 0, name_item)
                self.table.setItem(i, 1, QTableWidgetItem(g['phone'] or '-'))
                self.table.setItem(i, 2, QTableWidgetItem(g['email'] or '-'))
                self.table.setItem(i, 3, QTableWidgetItem(g['city'] or '-'))
                vip_item = QTableWidgetItem('\u2b50 VIP' if g['vip'] else 'No')
                if g['vip']:
                    vip_item.setForeground(Qt.GlobalColor.darkYellow)
                self.table.setItem(i, 4, vip_item)
                self.table.setItem(i, 5, QTableWidgetItem(str(g['total_stays'])))
                self.table.setItem(i, 6, QTableWidgetItem(f"\u20b9{g['total_spent']:,.0f}"))
                edit_btn = QPushButton('Edit')
                edit_btn.setFixedWidth(60)
                edit_btn.clicked.connect(lambda checked, gid=g['id']: self.edit_guest_dialog(gid))
                self.table.setCellWidget(i, 7, edit_btn)
            self.stack_layout.addWidget(self.table)

    def filter_guests(self, text):
        if not text:
            self.refresh()
            return
        guests = self.guest_model.search(text)
        self.refresh(guests)

    def add_guest_dialog(self):
        self.guest_form_dialog()

    def edit_guest_dialog(self, guest_id):
        guest = self.guest_model.get_by_id(guest_id)
        if guest:
            self.guest_form_dialog(guest=dict(guest))

    def guest_form_dialog(self, guest=None):
        dialog = QDialog(self)
        dialog.setWindowTitle('Edit Guest' if guest else 'Add Guest')
        dialog.setFixedSize(400, 480)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(10)

        form = QGroupBox('Guest Information')
        form_layout = QFormLayout(form)

        first_name = QLineEdit(guest['first_name'] if guest else '')
        form_layout.addRow('First Name:', first_name)

        last_name = QLineEdit(guest['last_name'] if guest else '')
        form_layout.addRow('Last Name:', last_name)

        phone = QLineEdit(guest['phone'] if guest else '')
        form_layout.addRow('Phone:', phone)

        email = QLineEdit(guest['email'] if guest else '')
        form_layout.addRow('Email:', email)

        city = QLineEdit(guest['city'] if guest else '')
        form_layout.addRow('City:', city)

        id_type = QComboBox()
        id_type.addItems(['', 'Aadhaar', 'Passport', 'Driving License', 'PAN Card', 'Voter ID'])
        if guest and guest.get('id_type'):
            idx = id_type.findText(guest['id_type'])
            if idx >= 0:
                id_type.setCurrentIndex(idx)
        form_layout.addRow('ID Type:', id_type)

        id_number = QLineEdit(guest['id_number'] if guest else '')
        form_layout.addRow('ID Number:', id_number)

        address = QLineEdit(guest['address'] if guest else '')
        form_layout.addRow('Address:', address)

        country = QLineEdit(guest.get('country', 'IN') if guest else 'IN')
        country.setFixedWidth(60)
        form_layout.addRow('Country:', country)

        vip_spin = QSpinBox()
        vip_spin.setRange(0, 1)
        vip_spin.setValue(guest['vip'] if guest else 0)
        form_layout.addRow('VIP:', vip_spin)

        layout.addWidget(form)

        def save():
            fn = first_name.text().strip()
            ln = last_name.text().strip()
            if not fn or not ln:
                QMessageBox.warning(dialog, 'Error', 'First and last name required')
                return

            data = {
                'first_name': fn, 'last_name': ln,
                'phone': phone.text().strip(),
                'email': email.text().strip(),
                'city': city.text().strip(),
                'id_type': id_type.currentText(),
                'id_number': id_number.text().strip(),
                'address': address.text().strip(),
                'country': country.text().strip(),
                'vip': vip_spin.value()
            }

            if guest:
                self.guest_model.update(guest['id'], **data)
            else:
                self.guest_model.create(**data)

            self.refresh()
            dialog.accept()

        btn = QPushButton('Save')
        btn.setObjectName('btnSuccess')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()
