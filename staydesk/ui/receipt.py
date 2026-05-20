import os
from datetime import datetime
from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTextEdit, QMessageBox, QFrame)
from PyQt6.QtCore import Qt
from PyQt6.QtPrintSupport import QPrinter, QPrintDialog, QPrintPreviewDialog
from PyQt6.QtGui import QTextDocument, QFont, QTextCursor
from database.db import Database


class ReceiptPrinter:
    def __init__(self, booking, extras, payments, guest=None, parent=None):
        self.booking = booking
        self.extras = extras
        self.payments = payments
        self.guest = guest
        self.parent = parent
        self.db = Database()

    def print_receipt(self):
        settings = {}
        rows = self.db.fetchall('SELECT * FROM settings')
        for r in rows:
            settings[r['key']] = r['value']

        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        printer.setPageSize(QPrinter.PageSize.A4)
        printer.setOrientation(QPrinter.Orientation.Portrait)

        preview = QPrintPreviewDialog(printer, self.parent)
        preview.setWindowTitle(f"Bill - {self.booking['booking_ref']}")
        preview.paintRequested.connect(lambda p: self.render(p, settings))
        preview.exec()

    def render(self, printer, settings):
        doc = QTextDocument()
        cursor = QTextCursor(doc)
        currency = settings.get('currency', '\u20b9')
        gst_rate = settings.get('gst_rate', '12')
        prop_name = settings.get('property_name', 'StayDesk Hotel')
        prop_address = settings.get('property_address', '')
        prop_phone = settings.get('property_phone', '')
        prop_gstin = settings.get('property_gstin', '')

        title_fmt = cursor.charFormat()
        title_fmt.setFontPointSize(22)
        title_fmt.setFontWeight(700)
        cursor.insertText(prop_name, title_fmt)
        cursor.insertBlock()

        info_fmt = cursor.charFormat()
        info_fmt.setFontPointSize(10)
        info_fmt.setFontWeight(400)
        cursor.insertText(prop_address, info_fmt)
        cursor.insertBlock()
        cursor.insertText(f"Phone: {prop_phone}", info_fmt)
        cursor.insertBlock()
        cursor.insertText(f"GSTIN: {prop_gstin}", info_fmt)
        cursor.insertBlock()

        sep_fmt = cursor.charFormat()
        sep_fmt.setFontPointSize(6)
        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        inv_fmt = cursor.charFormat()
        inv_fmt.setFontPointSize(14)
        inv_fmt.setFontWeight(600)
        cursor.insertText('INVOICE / RECEIPT', inv_fmt)
        cursor.insertBlock()

        now = datetime.now()
        cursor.insertText(f"Invoice #: INV-{now.strftime('%Y%m%d%H%M%S')}", info_fmt)
        cursor.insertBlock()
        cursor.insertText(f"Date: {now.strftime('%d %B %Y, %H:%M')}", info_fmt)
        cursor.insertBlock()
        cursor.insertText(f"Booking Ref: {self.booking['booking_ref']}", info_fmt)
        cursor.insertBlock()

        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        guest_name = self.booking.get('guest_name', 'N/A')
        guest_phone = self.booking.get('guest_phone', '')
        cursor.insertText(f"Guest: {guest_name}", info_fmt)
        cursor.insertBlock()
        if guest_phone:
            cursor.insertText(f"Phone: {guest_phone}", info_fmt)
            cursor.insertBlock()

        ci = self.booking['check_in_date'][:10]
        co = self.booking['check_out_date'][:10]
        cursor.insertText(f"Check-In: {ci}", info_fmt)
        cursor.insertBlock()
        cursor.insertText(f"Check-Out: {co}", info_fmt)
        cursor.insertBlock()

        room_id = self.booking.get('room_id', '')
        room_num = room_id[-3:] if room_id else 'N/A'
        cursor.insertText(f"Room: {room_num}", info_fmt)
        cursor.insertBlock()

        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        cursor.insertText('CHARGES', inv_fmt)
        cursor.insertBlock()
        cursor.insertBlock()

        item_fmt = cursor.charFormat()
        item_fmt.setFontPointSize(11)
        cursor.insertText(f"Room Charges ({self.booking['room_rate']:,}/night)", item_fmt)
        cursor.insertBlock()
        amount_fmt = cursor.charFormat()
        amount_fmt.setFontPointSize(11)
        amount_fmt.setFontWeight(600)
        cursor.insertText(f"{currency}{self.booking['base_amount']:,.0f}", amount_fmt)
        cursor.insertBlock()
        cursor.insertBlock()

        if self.extras:
            cursor.insertText('Extras:', item_fmt)
            cursor.insertBlock()
            for e in self.extras:
                cursor.insertText(f"  {e['description']}", info_fmt)
                cursor.insertText(f"  {currency}{e['amount']:,.0f}", amount_fmt)
                cursor.insertBlock()
            cursor.insertBlock()

        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        cursor.insertText(f"Subtotal:", item_fmt)
        cursor.insertText(f"  {currency}{self.booking['base_amount']:,.0f}", amount_fmt)
        cursor.insertBlock()
        cursor.insertText(f"GST ({gst_rate}%):", item_fmt)
        cursor.insertText(f"  {currency}{self.booking['tax_amount']:,.0f}", amount_fmt)
        cursor.insertBlock()
        cursor.insertText(f"Extras Total:", item_fmt)
        cursor.insertText(f"  {currency}{self.booking['extras_amount']:,.0f}", amount_fmt)
        cursor.insertBlock()

        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        total_fmt = cursor.charFormat()
        total_fmt.setFontPointSize(16)
        total_fmt.setFontWeight(700)
        cursor.insertText('TOTAL: ', total_fmt)
        cursor.insertText(f"{currency}{self.booking['total_amount']:,.0f}", total_fmt)
        cursor.insertBlock()
        cursor.insertBlock()

        if self.payments:
            cursor.insertText('PAYMENTS:', inv_fmt)
            cursor.insertBlock()
            for p in self.payments:
                cursor.insertText(f"  {currency}{p['amount']:,.0f} via {p['method']}", info_fmt)
                cursor.insertBlock()
            cursor.insertBlock()

        cursor.insertText('_' * 70, sep_fmt)
        cursor.insertBlock()

        footer_fmt = cursor.charFormat()
        footer_fmt.setFontPointSize(9)
        footer_fmt.setFontItalic(True)
        cursor.insertText('Thank you for staying with us!', footer_fmt)
        cursor.insertBlock()
        cursor.insertText('This is a computer-generated receipt.', footer_fmt)

        doc.print_(printer)
