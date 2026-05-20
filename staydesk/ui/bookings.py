from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTableWidget, QTableWidgetItem,
                              QHeaderView, QDialog, QLineEdit, QComboBox,
                              QDateEdit, QSpinBox, QTextEdit, QMessageBox,
                              QGroupBox, QFormLayout, QListWidget, QListWidgetItem,
                              QGridLayout, QFrame, QScrollArea, QTabWidget)
from PyQt6.QtCore import Qt, QDate
from datetime import datetime
from models.booking import BookingModel
from models.guest import GuestModel
from models.room import RoomModel
from models.staff import StaffModel
from ui.receipt import ReceiptPrinter

SOURCE_COLORS = {
    'Direct': ('#34d399', '#064e3b'),
    'Walk-in': ('#60a5fa', '#1e3a5f'),
    'MakeMyTrip': ('#f472b6', '#831843'),
    'Booking.com': ('#3b82f6', '#1e3a5f'),
    'Airbnb': ('#f87171', '#450a0a'),
    'Agoda': ('#c084fc', '#3b0764'),
    'Expedia': ('#fbbf24', '#451a03'),
    'Goibibo': ('#fb923c', '#431407'),
}


class BookingsPage(QWidget):
    def __init__(self, current_staff=None):
        super().__init__()
        self.booking_model = BookingModel()
        self.guest_model = GuestModel()
        self.room_model = RoomModel()
        self.staff_model = StaffModel()
        self.current_staff = current_staff
        self.filter_status = 'all'
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Bookings')
        title.setObjectName('title')
        header.addWidget(title)

        self.filter_tabs = QHBoxLayout()
        self.filter_tabs.setSpacing(6)
        for label, key in [('All', 'all'), ('Confirmed', 'confirmed'), ('Checked In', 'checkedin'),
                           ('Checked Out', 'checkedout'), ('Cancelled', 'cancelled')]:
            btn = QPushButton(label)
            btn.setObjectName('btnSecondary')
            btn.setCheckable(True)
            btn.setChecked(key == 'all')
            btn.clicked.connect(lambda checked, k=key: self.set_filter(k))
            self.filter_tabs.addWidget(btn)
        header.addLayout(self.filter_tabs)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Search by ref, guest name...')
        self.search_input.setFixedWidth(250)
        self.search_input.textChanged.connect(self.filter_bookings)
        header.addWidget(self.search_input)

        new_btn = QPushButton('+ New Booking')
        new_btn.setObjectName('btnSuccess')
        new_btn.clicked.connect(self.new_booking_wizard)
        header.addWidget(new_btn)
        layout.addLayout(header)

        self.table = QTableWidget()
        self.table.setColumnCount(10)
        self.table.setHorizontalHeaderLabels(['Ref', 'Guest', 'Room', 'Check-In', 'Check-Out', 'Nights', 'Total', 'Source', 'Status', 'Actions'])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)

        self.refresh()

    def set_filter(self, status):
        self.filter_status = status
        for btn in self.findChildren(QPushButton):
            if btn in [self.filter_tabs.itemAt(i).widget() for i in range(self.filter_tabs.count())]:
                btn.setChecked(False)
        self.refresh()

    def refresh(self, bookings=None):
        if bookings is None:
            all_bookings = self.booking_model.get_all()
            if self.filter_status != 'all':
                bookings = [b for b in all_bookings if b['status'] == self.filter_status]
            else:
                bookings = all_bookings

        self.table.setRowCount(len(bookings))
        for i, b in enumerate(bookings):
            self.table.setItem(i, 0, QTableWidgetItem(b['booking_ref']))
            self.table.setItem(i, 1, QTableWidgetItem(b['guest_name']))
            self.table.setItem(i, 2, QTableWidgetItem(b['room_id'][-3:] if b['room_id'] else ''))
            self.table.setItem(i, 3, QTableWidgetItem(b['check_in_date'][:10]))
            self.table.setItem(i, 4, QTableWidgetItem(b['check_out_date'][:10]))

            ci = datetime.fromisoformat(b['check_in_date'])
            co = datetime.fromisoformat(b['check_out_date'])
            nights = max(1, (co - ci).days)
            self.table.setItem(i, 5, QTableWidgetItem(str(nights)))

            self.table.setItem(i, 6, QTableWidgetItem(f"\u20b9{b['total_amount']:,.0f}"))

            source = b['source'] or 'Direct'
            source_item = QTableWidgetItem(source)
            color, bg = SOURCE_COLORS.get(source, ('#a1a1aa', '#2a2d3a'))
            source_item.setForeground(Qt.GlobalColor(color=0))
            self.table.setItem(i, 7, source_item)

            status_item = QTableWidgetItem(b['status'].upper())
            self.table.setItem(i, 8, status_item)

            action_layout = QHBoxLayout()
            action_layout.setContentsMargins(4, 2, 4, 2)
            action_layout.setSpacing(4)

            if b['status'] == 'confirmed':
                ci_btn = QPushButton('In')
                ci_btn.setObjectName('btnSuccess')
                ci_btn.setFixedWidth(35)
                ci_btn.clicked.connect(lambda checked, bid=b['id']: self.quick_checkin(bid))
                action_layout.addWidget(ci_btn)

            if b['status'] == 'checkedin':
                co_btn = QPushButton('Out')
                co_btn.setObjectName('btnWarning')
                co_btn.setFixedWidth(35)
                co_btn.clicked.connect(lambda checked, bid=b['id']: self.quick_checkout(bid))
                action_layout.addWidget(co_btn)

            view_btn = QPushButton('View')
            view_btn.setFixedWidth(50)
            view_btn.clicked.connect(lambda checked, bid=b['id']: self.view_booking(bid))
            action_layout.addWidget(view_btn)

            action_widget = QWidget()
            action_widget.setLayout(action_layout)
            self.table.setCellWidget(i, 9, action_widget)

    def filter_bookings(self, text):
        if not text:
            self.refresh()
            return
        all_bookings = self.booking_model.get_all()
        filtered = [b for b in all_bookings if text.lower() in b['booking_ref'].lower()
                    or text.lower() in (b['guest_name'] or '').lower()
                    or text.lower() in (b['guest_phone'] or '').lower()]
        if self.filter_status != 'all':
            filtered = [b for b in filtered if b['status'] == self.filter_status]
        self.table.setRowCount(len(filtered))
        for i, b in enumerate(filtered):
            self.table.setItem(i, 0, QTableWidgetItem(b['booking_ref']))
            self.table.setItem(i, 1, QTableWidgetItem(b['guest_name']))
            self.table.setItem(i, 2, QTableWidgetItem(b['room_id'][-3:] if b['room_id'] else ''))
            self.table.setItem(i, 3, QTableWidgetItem(b['check_in_date'][:10]))
            self.table.setItem(i, 4, QTableWidgetItem(b['check_out_date'][:10]))
            ci = datetime.fromisoformat(b['check_in_date'])
            co = datetime.fromisoformat(b['check_out_date'])
            nights = max(1, (co - ci).days)
            self.table.setItem(i, 5, QTableWidgetItem(str(nights)))
            self.table.setItem(i, 6, QTableWidgetItem(f"\u20b9{b['total_amount']:,.0f}"))
            source = b['source'] or 'Direct'
            self.table.setItem(i, 7, QTableWidgetItem(source))
            self.table.setItem(i, 8, QTableWidgetItem(b['status'].upper()))
            view_btn = QPushButton('View')
            view_btn.setFixedWidth(50)
            view_btn.clicked.connect(lambda checked, bid=b['id']: self.view_booking(bid))
            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(4, 2, 4, 2)
            action_layout.addWidget(view_btn)
            self.table.setCellWidget(i, 9, action_widget)

    def quick_checkin(self, booking_id):
        self.booking_model.update_status(booking_id, 'checkedin')
        booking = self.booking_model.get_by_id(booking_id)
        if booking and booking['room_id']:
            self.room_model.update_status(booking['room_id'], 'occupied', f"Check-in: {booking_id}")
        self.refresh()

    def quick_checkout(self, booking_id):
        self.booking_model.update_status(booking_id, 'checkedout')
        booking = self.booking_model.get_by_id(booking_id)
        if booking and booking['room_id']:
            self.room_model.update_status(booking['room_id'], 'checkout', f"Check-out: {booking_id}")
        if booking and booking['guest_id']:
            self.guest_model.increment_stay(booking['guest_id'], booking['total_amount'])
        self.refresh()

    def view_booking(self, booking_id):
        booking = self.booking_model.get_by_id(booking_id)
        if not booking:
            return

        extras = self.booking_model.get_extras(booking_id)
        payments = self.booking_model.get_payments(booking_id)

        dialog = QDialog(self)
        dialog.setWindowTitle(f"Booking {booking['booking_ref']}")
        dialog.setFixedSize(550, 500)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(12)

        tabs = QTabWidget()

        details_tab = QWidget()
        details_layout = QVBoxLayout(details_tab)
        details_layout.setSpacing(8)

        info = QGroupBox('Booking Details')
        info_layout = QFormLayout(info)
        info_layout.addRow('Guest:', QLabel(booking['guest_name']))
        info_layout.addRow('Phone:', QLabel(booking['guest_phone'] or '-'))
        info_layout.addRow('Email:', QLabel(booking['guest_email'] or '-'))
        info_layout.addRow('Check-In:', QLabel(booking['check_in_date'][:10]))
        info_layout.addRow('Check-Out:', QLabel(booking['check_out_date'][:10]))
        ci = datetime.fromisoformat(booking['check_in_date'])
        co = datetime.fromisoformat(booking['check_out_date'])
        nights = max(1, (co - ci).days)
        info_layout.addRow('Nights:', QLabel(str(nights)))
        info_layout.addRow('Adults:', QLabel(str(booking['adults'])))
        info_layout.addRow('Children:', QLabel(str(booking['children'])))
        info_layout.addRow('Room Rate:', QLabel(f"\u20b9{booking['room_rate']:,}/night"))
        info_layout.addRow('Base Amount:', QLabel(f"\u20b9{booking['base_amount']:,.0f}"))
        info_layout.addRow('Tax (GST):', QLabel(f"\u20b9{booking['tax_amount']:,.0f}"))
        info_layout.addRow('Extras:', QLabel(f"\u20b9{booking['extras_amount']:,.0f}"))
        total_lbl = QLabel(f"\u20b9{booking['total_amount']:,.0f}")
        total_lbl.setStyleSheet("font-size: 16px; font-weight: 700; color: #10b981;")
        info_layout.addRow('Total:', total_lbl)
        info_layout.addRow('Status:', QLabel(booking['status'].upper()))
        info_layout.addRow('Source:', QLabel(booking['source'] or 'Direct'))
        if booking.get('notes'):
            info_layout.addRow('Notes:', QLabel(booking['notes']))
        details_layout.addWidget(info)
        tabs.addTab(details_tab, 'Details')

        extras_tab = QWidget()
        extras_layout = QVBoxLayout(extras_tab)
        for e in extras:
            extras_layout.addWidget(QLabel(f"{e['description']}: \u20b9{e['amount']:,.0f}"))
        if not extras:
            extras_layout.addWidget(QLabel('No extras added'))
        add_extra_btn = QPushButton('+ Add Extra')
        add_extra_btn.setObjectName('btnSecondary')
        add_extra_btn.setFixedWidth(120)
        add_extra_btn.clicked.connect(lambda: self.add_extra_dialog(booking_id, dialog))
        extras_layout.addWidget(add_extra_btn)
        tabs.addTab(extras_tab, f"Extras ({len(extras)})")

        payments_tab = QWidget()
        payments_layout = QVBoxLayout(payments_tab)
        for p in payments:
            payments_layout.addWidget(QLabel(f"\u20b9{p['amount']:,.0f} via {p['method']} ({p['status']})"))
        if not payments:
            payments_layout.addWidget(QLabel('No payments recorded'))
        add_pay_btn = QPushButton('+ Add Payment')
        add_pay_btn.setObjectName('btnSecondary')
        add_pay_btn.setFixedWidth(130)
        add_pay_btn.clicked.connect(lambda: self.add_payment_dialog(booking_id, dialog))
        payments_layout.addWidget(add_pay_btn)
        tabs.addTab(payments_tab, f"Payments ({len(payments)})")

        layout.addWidget(tabs)

        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(8)

        if booking['status'] == 'confirmed':
            checkin_btn = QPushButton('Check In')
            checkin_btn.setObjectName('btnSuccess')
            checkin_btn.clicked.connect(lambda: self.do_checkin(booking_id, dialog))
            btn_layout.addWidget(checkin_btn)

        if booking['status'] == 'checkedin':
            checkout_btn = QPushButton('Check Out')
            checkout_btn.setObjectName('btnWarning')
            checkout_btn.clicked.connect(lambda: self.do_checkout(booking_id, dialog))
            btn_layout.addWidget(checkout_btn)

        print_btn = QPushButton('Print Bill')
        print_btn.setObjectName('btnSecondary')
        print_btn.clicked.connect(lambda: self.print_bill(booking_id))
        btn_layout.addWidget(print_btn)

        layout.addLayout(btn_layout)
        dialog.exec()
        self.refresh()

    def do_checkin(self, booking_id, dialog):
        self.booking_model.update_status(booking_id, 'checkedin')
        booking = self.booking_model.get_by_id(booking_id)
        if booking and booking['room_id']:
            self.room_model.update_status(booking['room_id'], 'occupied', f"Check-in: {booking_id}")
        dialog.accept()

    def do_checkout(self, booking_id, dialog):
        self.booking_model.update_status(booking_id, 'checkedout')
        booking = self.booking_model.get_by_id(booking_id)
        if booking and booking['room_id']:
            self.room_model.update_status(booking['room_id'], 'checkout', f"Check-out: {booking_id}")
        if booking and booking['guest_id']:
            self.guest_model.increment_stay(booking['guest_id'], booking['total_amount'])
        dialog.accept()

    def print_bill(self, booking_id):
        booking = self.booking_model.get_by_id(booking_id)
        if not booking:
            return
        extras = self.booking_model.get_extras(booking_id)
        payments = self.booking_model.get_payments(booking_id)
        guest = self.guest_model.get_by_id(booking['guest_id']) if booking['guest_id'] else None
        printer = ReceiptPrinter(booking, extras, payments, guest, self)
        printer.print_receipt()

    def add_extra_dialog(self, booking_id, parent_dialog):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add Extra Charge')
        dialog.setFixedSize(300, 180)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')
        layout = QVBoxLayout(dialog)
        desc = QLineEdit()
        desc.setPlaceholderText('Description')
        layout.addWidget(desc)
        amount = QLineEdit()
        amount.setPlaceholderText('Amount')
        layout.addWidget(amount)
        def save():
            try:
                d = desc.text().strip()
                a = float(amount.text().strip())
                if not d:
                    return
                self.booking_model.add_extra(booking_id, d, a)
                dialog.accept()
                parent_dialog.accept()
                self.view_booking(booking_id)
            except ValueError:
                pass
        btn = QPushButton('Add')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()

    def add_payment_dialog(self, booking_id, parent_dialog):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add Payment')
        dialog.setFixedSize(300, 220)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')
        layout = QVBoxLayout(dialog)
        amount = QLineEdit()
        amount.setPlaceholderText('Amount')
        layout.addWidget(amount)
        method = QComboBox()
        method.addItems(['Cash', 'Card', 'UPI', 'Bank Transfer'])
        layout.addWidget(method)
        ref = QLineEdit()
        ref.setPlaceholderText('Reference (optional)')
        layout.addWidget(ref)
        def save():
            try:
                a = float(amount.text().strip())
                self.booking_model.add_payment(booking_id, a, method.currentText(), ref.text())
                dialog.accept()
                parent_dialog.accept()
                self.view_booking(booking_id)
            except ValueError:
                pass
        btn = QPushButton('Record Payment')
        btn.setObjectName('btnSuccess')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()

    def new_booking_wizard(self):
        dialog = QDialog(self)
        dialog.setWindowTitle('New Booking')
        dialog.setFixedSize(550, 500)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(16)

        self.selected_guest = None
        self.selected_room = None

        step_indicator = QHBoxLayout()
        step_indicator.setSpacing(8)
        self.step_labels = []
        for i, label in enumerate(['1. Guest', '2. Room & Dates', '3. Confirm']):
            lbl = QLabel(label)
            lbl.setStyleSheet(f"font-size: 12px; font-weight: {'700' if i == 0 else '400'}; color: {'#3b82f6' if i == 0 else '#71717a'};")
            step_indicator.addWidget(lbl)
            self.step_labels.append(lbl)
            if i < 2:
                sep = QLabel(' > ')
                sep.setStyleSheet("color: #52525b; font-size: 12px;")
                step_indicator.addWidget(sep)
        step_indicator.addStretch()
        layout.addLayout(step_indicator)

        self.stacks = QWidget()
        self.stack_layout = QVBoxLayout(self.stacks)
        self.stack_layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.stacks)

        self.current_step = 0
        self.show_step(0, dialog, layout)

        dialog.exec()

    def show_step(self, step, dialog, main_layout):
        while self.stack_layout.count():
            item = self.stack_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if step == 0:
            self.build_step1_guest(main_layout, dialog)
        elif step == 1:
            self.build_step2_room_dates(main_layout, dialog)
        elif step == 2:
            self.build_step3_confirm(main_layout, dialog)

        for i, lbl in enumerate(self.step_labels):
            is_active = i == step
            is_done = i < step
            if is_done:
                lbl.setStyleSheet("font-size: 12px; font-weight: 600; color: #10b981;")
            elif is_active:
                lbl.setStyleSheet("font-size: 12px; font-weight: 700; color: #3b82f6;")
            else:
                lbl.setStyleSheet("font-size: 12px; font-weight: 400; color: #71717a;")

    def build_step1_guest(self, layout, dialog):
        search = QLineEdit()
        search.setPlaceholderText('Search existing guest by name or phone...')
        layout.addWidget(QLabel('Search Guest:'))
        layout.addWidget(search)

        results = QListWidget()
        results.setFixedHeight(120)
        results.hide()
        layout.addWidget(results)

        def on_search(text):
            if len(text) < 2:
                results.hide()
                return
            guests = self.guest_model.search(text)
            results.clear()
            for g in guests:
                item = QListWidgetItem(f"{g['first_name']} {g['last_name']} - {g['phone']}")
                item.setData(Qt.ItemDataRole.UserRole, dict(g))
                results.addItem(item)
            results.show() if guests else results.hide()

        search.textChanged.connect(on_search)

        def select_guest(item):
            self.selected_guest = item.data(Qt.ItemDataRole.UserRole)
            results.hide()
            search.setText(f"{self.selected_guest['first_name']} {self.selected_guest['last_name']}")

        results.itemClicked.connect(select_guest)

        or_lbl = QLabel('--- OR Create New Guest ---')
        or_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        or_lbl.setStyleSheet("color: #52525b; font-size: 12px; margin: 8px 0;")
        layout.addWidget(or_lbl)

        form = QGroupBox('New Guest')
        form_layout = QFormLayout(form)
        fn = QLineEdit()
        form_layout.addRow('First Name*:', fn)
        ln = QLineEdit()
        form_layout.addRow('Last Name*:', ln)
        ph = QLineEdit()
        form_layout.addRow('Phone:', ph)
        em = QLineEdit()
        form_layout.addRow('Email:', em)
        layout.addWidget(form)

        btn_row = QHBoxLayout()
        back_btn = QPushButton('Cancel')
        back_btn.setObjectName('btnSecondary')
        back_btn.clicked.connect(dialog.reject)
        btn_row.addWidget(back_btn)

        next_btn = QPushButton('Next: Select Room')
        next_btn.setObjectName('btnSuccess')
        def go_next():
            if self.selected_guest:
                self.show_step(1, dialog, main_layout=layout.parent().parent().layout() if hasattr(layout, 'parent') else layout)
                self.current_step = 1
                return
            fn_val = fn.text().strip()
            ln_val = ln.text().strip()
            if not fn_val or not ln_val:
                QMessageBox.warning(dialog, 'Error', 'First and last name required')
                return
            self.selected_guest = self.guest_model.create(fn_val, ln_val, ph.text().strip(), em.text().strip())
            self.show_step(1, dialog, main_layout=layout.parent().parent().layout() if hasattr(layout, 'parent') else layout)
            self.current_step = 1
        next_btn.clicked.connect(go_next)
        btn_row.addWidget(next_btn)
        layout.addLayout(btn_row)

    def build_step2_room_dates(self, layout, dialog):
        form = QGroupBox('Dates & Room')
        form_layout = QFormLayout(form)

        ci = QDateEdit()
        ci.setDate(QDate.currentDate())
        ci.setCalendarPopup(True)
        form_layout.addRow('Check-In:', ci)

        co = QDateEdit()
        co.setDate(QDate.currentDate().addDays(1))
        co.setCalendarPopup(True)
        form_layout.addRow('Check-Out:', co)

        layout.addWidget(form)

        room_scroll = QScrollArea()
        room_scroll.setWidgetResizable(True)
        room_scroll.setFixedHeight(180)
        layout.addWidget(QLabel('Available Rooms:'))
        layout.addWidget(room_scroll)

        room_container = QWidget()
        room_grid = QGridLayout(room_container)
        room_grid.setSpacing(8)

        rooms = self.room_model.get_all()
        available_rooms = [r for r in rooms if r['status'] == 'available']
        self.selected_room = None

        for i, r in enumerate(available_rooms):
            row = i // 3
            col = i % 3
            card = QFrame()
            card.setObjectName('card')
            card.setFixedHeight(60)
            card.setCheckable = True
            c_layout = QHBoxLayout(card)
            c_layout.setContentsMargins(10, 8, 10, 8)
            c_layout.addWidget(QLabel(f"Room {r['number']}"))
            c_layout.addWidget(QLabel(r['type_name']))
            c_layout.addStretch()
            c_layout.addWidget(QLabel(f"\u20b9{r['rate']:,}"))
            room_grid.addWidget(card, row, col)

            def select_room(checked, room_data=r):
                self.selected_room = room_data
                for j in range(room_grid.count()):
                    w = room_grid.itemAt(j).widget()
                    if w:
                        w.setStyleSheet("QFrame#card { background-color: #1a1d2e; border: 1px solid #2a2d3a; border-radius: 8px; }")
                card.setStyleSheet("QFrame#card { background-color: #1e3a5f; border: 2px solid #3b82f6; border-radius: 8px; }")

            card.mousePressEvent = lambda e, r=r: select_room(True, r)

        room_scroll.setWidget(room_container)

        btn_row = QHBoxLayout()
        back_btn = QPushButton('Back')
        back_btn.setObjectName('btnSecondary')
        back_btn.clicked.connect(lambda: self.show_step(0, dialog, layout))
        btn_row.addWidget(back_btn)

        next_btn = QPushButton('Next: Review')
        next_btn.setObjectName('btnSuccess')
        def go_next():
            if not self.selected_room:
                QMessageBox.warning(dialog, 'Error', 'Please select a room')
                return
            self._ci_date = ci.date().toString('yyyy-MM-dd')
            self._co_date = co.date().toString('yyyy-MM-dd')
            self.show_step(2, dialog, layout)
            self.current_step = 2
        next_btn.clicked.connect(go_next)
        btn_row.addWidget(next_btn)
        layout.addLayout(btn_row)

    def build_step3_confirm(self, layout, dialog):
        if not self.selected_room or not self.selected_guest:
            return

        ci = datetime.fromisoformat(self._ci_date)
        co = datetime.fromisoformat(self._co_date)
        nights = max(1, (co - ci).days)
        base = self.selected_room['rate'] * nights
        gst_rate = float(self.room_model.db.fetchone("SELECT value FROM settings WHERE key = 'gst_rate'")['value'])
        tax = round(base * gst_rate / 100, 2)
        total = base + tax

        summary = QGroupBox('Booking Summary')
        s_layout = QFormLayout(summary)
        s_layout.addRow('Guest:', QLabel(f"{self.selected_guest['first_name']} {self.selected_guest['last_name']}"))
        s_layout.addRow('Room:', QLabel(f"Room {self.selected_room['number']} - {self.selected_room['type_name']}"))
        s_layout.addRow('Check-In:', QLabel(self._ci_date))
        s_layout.addRow('Check-Out:', QLabel(self._co_date))
        s_layout.addRow('Nights:', QLabel(str(nights)))
        s_layout.addRow('Rate/Night:', QLabel(f"\u20b9{self.selected_room['rate']:,}"))
        s_layout.addRow('Base Amount:', QLabel(f"\u20b9{base:,.0f}"))
        s_layout.addRow(f"GST ({gst_rate}%):", QLabel(f"\u20b9{tax:,.0f}"))
        total_lbl = QLabel(f"\u20b9{total:,.0f}")
        total_lbl.setStyleSheet("font-size: 18px; font-weight: 700; color: #10b981;")
        s_layout.addRow('Total:', total_lbl)
        layout.addWidget(summary)

        details = QGroupBox('Additional Details')
        d_layout = QFormLayout(details)

        adults_spin = QSpinBox()
        adults_spin.setRange(1, 10)
        adults_spin.setValue(1)
        d_layout.addRow('Adults:', adults_spin)

        children_spin = QSpinBox()
        children_spin.setRange(0, 10)
        d_layout.addRow('Children:', children_spin)

        source_combo = QComboBox()
        source_combo.addItems(['Direct', 'Walk-in', 'MakeMyTrip', 'Booking.com', 'Agoda', 'Goibibo', 'Airbnb', 'Expedia'])
        d_layout.addRow('Source:', source_combo)

        notes_edit = QTextEdit()
        notes_edit.setFixedHeight(50)
        notes_edit.setPlaceholderText('Notes...')
        d_layout.addRow('Notes:', notes_edit)
        layout.addWidget(details)

        btn_row = QHBoxLayout()
        back_btn = QPushButton('Back')
        back_btn.setObjectName('btnSecondary')
        back_btn.clicked.connect(lambda: self.show_step(1, dialog, layout))
        btn_row.addWidget(back_btn)

        confirm_btn = QPushButton('Create Booking')
        confirm_btn.setObjectName('btnSuccess')
        def confirm():
            staff_id = self.current_staff['id'] if self.current_staff else None
            self.booking_model.create(
                room_id=self.selected_room['id'],
                guest_id=self.selected_guest['id'],
                guest_name=f"{self.selected_guest['first_name']} {self.selected_guest['last_name']}",
                guest_phone=self.selected_guest.get('phone', ''),
                guest_email=self.selected_guest.get('email', ''),
                check_in=self._ci_date, check_out=self._co_date,
                adults=adults_spin.value(), children=children_spin.value(),
                room_rate=self.selected_room['rate'],
                source=source_combo.currentText(),
                notes=notes_edit.toPlainText(),
                staff_id=staff_id
            )
            self.room_model.update_status(self.selected_room['id'], 'reserved',
                                          f"Booked for {self.selected_guest['first_name']}")
            QMessageBox.information(dialog, 'Success', 'Booking created successfully!')
            dialog.accept()
            if hasattr(self, 'refresh'):
                self.refresh()
        confirm_btn.clicked.connect(confirm)
        btn_row.addWidget(confirm_btn)
        layout.addLayout(btn_row)
