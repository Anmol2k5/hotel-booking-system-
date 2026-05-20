from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTableWidget, QTableWidgetItem,
                              QHeaderView, QFrame, QLineEdit, QMessageBox,
                              QScrollArea, QGridLayout, QGroupBox, QFormLayout,
                              QComboBox, QDialog)
from PyQt6.QtCore import Qt, QTimer
from datetime import datetime
from models.booking import BookingModel
from models.room import RoomModel
from models.guest import GuestModel
from ui.receipt import ReceiptPrinter


class CheckoutCard(QFrame):
    def __init__(self, booking, parent=None):
        super().__init__(parent)
        self.booking = booking
        self.setObjectName('card')
        self.setFixedHeight(200)
        self.is_checked_out = False
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(8)

        top_row = QHBoxLayout()
        guest_name = QLabel(self.booking['guest_name'])
        guest_name.setStyleSheet("font-size: 16px; font-weight: 700; color: #ffffff;")
        top_row.addWidget(guest_name)

        ref_label = QLabel(self.booking['booking_ref'])
        ref_label.setStyleSheet("font-size: 12px; color: #71717a; font-family: monospace;")
        top_row.addStretch()
        top_row.addWidget(ref_label)
        layout.addLayout(top_row)

        room_label = QLabel(f"Room {self.booking['room_id'][-3:] if self.booking['room_id'] else 'N/A'}")
        room_label.setStyleSheet("font-size: 13px; color: #a1a1aa;")
        layout.addWidget(room_label)

        summary = QGridLayout()
        summary.setSpacing(12)

        ci = datetime.fromisoformat(self.booking['check_in_date'])
        co = datetime.fromisoformat(self.booking['check_out_date'])
        nights = max(1, (co - ci).days)

        labels = [
            ('Check-In', ci.strftime('%d %b')),
            ('Check-Out', co.strftime('%d %b')),
            ('Duration', f"{nights} night(s)"),
            ('Charges', f"\u20b9{self.booking['total_amount']:,.0f}"),
        ]
        for i, (lbl, val) in enumerate(labels):
            col = i
            l = QLabel(lbl)
            l.setStyleSheet("font-size: 10px; color: #71717a; text-transform: uppercase;")
            summary.addWidget(l, 0, col)
            v = QLabel(val)
            v.setStyleSheet("font-size: 14px; font-weight: 600; color: #ffffff;")
            summary.addWidget(v, 1, col)
        layout.addLayout(summary)

        layout.addStretch()

        btn_row = QHBoxLayout()
        btn_row.setSpacing(8)

        self.view_btn = QPushButton('View Details')
        self.view_btn.setObjectName('btnSecondary')
        self.view_btn.setFixedWidth(100)
        btn_row.addWidget(self.view_btn)

        self.checkout_btn = QPushButton('Check Out')
        self.checkout_btn.setObjectName('btnWarning')
        self.checkout_btn.setFixedWidth(100)
        btn_row.addWidget(self.checkout_btn)

        btn_row.addStretch()
        layout.addLayout(btn_row)

    def mark_done(self):
        self.is_checked_out = True
        self.setStyleSheet("""
            QFrame {
                background-color: #1a1d2e;
                border: 2px solid #059669;
                border-radius: 12px;
            }
        """)
        self.checkout_btn.setText('\u2713 Done')
        self.checkout_btn.setEnabled(False)
        self.checkout_btn.setObjectName('btnSuccess')


class CheckOutPage(QWidget):
    def __init__(self, current_staff=None):
        super().__init__()
        self.booking_model = BookingModel()
        self.room_model = RoomModel()
        self.guest_model = GuestModel()
        self.current_staff = current_staff
        self.cards = []
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Check-Out')
        title.setObjectName('title')
        header.addWidget(title)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Search departures...')
        self.search_input.setFixedWidth(250)
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
        self.bookings = self.booking_model.get_today_checkouts()
        self.subtitle.setText(f"{len(self.bookings)} departure(s) scheduled for today")

        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        self.cards = []
        for i, b in enumerate(self.bookings):
            row = i // 2
            col = i % 2
            card = CheckoutCard(dict(b))
            card.view_btn.clicked.connect(lambda checked, bid=b['id']: self.view_booking(bid))
            card.checkout_btn.clicked.connect(lambda checked, c=card, bid=b['id']: self.perform_checkout(c, bid))
            self.grid_layout.addWidget(card, row, col)
            self.cards.append(card)

    def filter_bookings(self, text):
        if not text:
            self.refresh()
            return
        filtered = [b for b in self.bookings
                    if text.lower() in b['booking_ref'].lower()
                    or text.lower() in (b['guest_name'] or '').lower()]
        self.subtitle.setText(f"{len(filtered)} result(s)")

        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self.cards = []
        for i, b in enumerate(filtered):
            row = i // 2
            col = i % 2
            card = CheckoutCard(dict(b))
            card.view_btn.clicked.connect(lambda checked, bid=b['id']: self.view_booking(bid))
            card.checkout_btn.clicked.connect(lambda checked, c=card, bid=b['id']: self.perform_checkout(c, bid))
            self.grid_layout.addWidget(card, row, col)
            self.cards.append(card)

    def view_booking(self, booking_id):
        booking = self.booking_model.get_by_id(booking_id)
        if not booking:
            return

        extras = self.booking_model.get_extras(booking_id)
        payments = self.booking_model.get_payments(booking_id)

        dialog = QDialog(self)
        dialog.setWindowTitle(f"Check-Out: {booking['booking_ref']}")
        dialog.setFixedSize(550, 550)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(12)

        header_info = QGroupBox('Booking Summary')
        h_layout = QFormLayout(header_info)
        h_layout.addRow('Guest:', QLabel(booking['guest_name']))
        h_layout.addRow('Room:', QLabel(f"Room {booking['room_id'][-3:]}" if booking['room_id'] else QLabel('N/A')))
        h_layout.addRow('Check-In:', QLabel(booking['check_in_date'][:10]))
        h_layout.addRow('Check-Out:', QLabel(booking['check_out_date'][:10]))
        ci = datetime.fromisoformat(booking['check_in_date'])
        co = datetime.fromisoformat(booking['check_out_date'])
        nights = max(1, (co - ci).days)
        h_layout.addRow('Nights:', QLabel(str(nights)))
        layout.addWidget(header_info)

        charges = QGroupBox('Charges Breakdown')
        c_layout = QFormLayout(charges)
        c_layout.addRow('Room Charges:', QLabel(f"\u20b9{booking['base_amount']:,.0f}"))
        c_layout.addRow('Extras:', QLabel(f"\u20b9{booking['extras_amount']:,.0f}"))
        c_layout.addRow('GST Tax:', QLabel(f"\u20b9{booking['tax_amount']:,.0f}"))
        total_label = QLabel(f"\u20b9{booking['total_amount']:,.0f}")
        total_label.setStyleSheet("font-size: 16px; font-weight: 700; color: #10b981;")
        c_layout.addRow('Total:', total_label)
        layout.addWidget(charges)

        extras_group = QGroupBox(f"Extras ({len(extras)})")
        e_layout = QVBoxLayout(extras_group)
        if extras:
            for e in extras:
                e_layout.addWidget(QLabel(f"{e['description']}: \u20b9{e['amount']:,.0f}"))
        else:
            e_layout.addWidget(QLabel('No extras added'))
        add_extra_btn = QPushButton('+ Add Extra')
        add_extra_btn.setObjectName('btnSecondary')
        add_extra_btn.setFixedWidth(120)
        add_extra_btn.clicked.connect(lambda: self.add_extra_inline(booking_id, dialog))
        e_layout.addWidget(add_extra_btn)
        layout.addWidget(extras_group)

        payments_group = QGroupBox(f"Payments ({len(payments)})")
        p_layout = QVBoxLayout(payments_group)
        if payments:
            for p in payments:
                p_layout.addWidget(QLabel(f"\u20b9{p['amount']:,.0f} via {p['method']} ({p['status']})"))
        else:
            p_layout.addWidget(QLabel('No payments recorded'))
        add_pay_btn = QPushButton('+ Add Payment')
        add_pay_btn.setObjectName('btnSecondary')
        add_pay_btn.setFixedWidth(130)
        add_pay_btn.clicked.connect(lambda: self.add_payment_inline(booking_id, dialog))
        p_layout.addWidget(add_pay_btn)
        layout.addWidget(payments_group)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        print_btn = QPushButton('Print Bill')
        print_btn.setObjectName('btnSecondary')
        print_btn.clicked.connect(lambda: self.print_bill(booking_id))
        btn_row.addWidget(print_btn)

        checkout_btn = QPushButton('Process Check-Out')
        checkout_btn.setObjectName('btnWarning')
        checkout_btn.clicked.connect(lambda: self.do_checkout(booking_id, dialog))
        btn_row.addWidget(checkout_btn)

        layout.addLayout(btn_row)
        dialog.exec()

    def add_extra_inline(self, booking_id, parent_dialog):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add Extra Charge')
        dialog.setFixedSize(300, 180)
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

    def add_payment_inline(self, booking_id, parent_dialog):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add Payment')
        dialog.setFixedSize(300, 220)
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

    def print_bill(self, booking_id):
        booking = self.booking_model.get_by_id(booking_id)
        if not booking:
            return
        extras = self.booking_model.get_extras(booking_id)
        payments = self.booking_model.get_payments(booking_id)
        guest = self.guest_model.get_by_id(booking['guest_id']) if booking['guest_id'] else None

        printer = ReceiptPrinter(booking, extras, payments, guest, self)
        printer.print_receipt()

    def perform_checkout(self, card, booking_id):
        self.do_checkout(booking_id, None, card)

    def do_checkout(self, booking_id, parent_dialog=None, card=None):
        try:
            self.booking_model.update_status(booking_id, 'checkedout')
            booking = self.booking_model.get_by_id(booking_id)
            if booking and booking['room_id']:
                self.room_model.update_status(booking['room_id'], 'checkout', f"Check-out: {booking['booking_ref']}")
            if booking and booking['guest_id']:
                self.guest_model.increment_stay(booking['guest_id'], booking['total_amount'])

            if card:
                card.mark_done()

            if parent_dialog:
                parent_dialog.accept()

            QMessageBox.information(self, 'Check-Out Complete',
                                    f"{booking['guest_name']} has been checked out successfully.")
            self.refresh()
        except Exception as e:
            QMessageBox.warning(self, 'Error', str(e))
