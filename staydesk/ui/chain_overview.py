from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QGridLayout, QFrame, QPushButton, QScrollArea,
                              QProgressBar, QTableWidget, QTableWidgetItem,
                              QHeaderView, QDialog, QLineEdit, QComboBox,
                              QMessageBox, QGroupBox, QFormLayout, QSpinBox,
                              QTextEdit, QTabWidget)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from datetime import datetime, timedelta
from models.property import PropertyModel
from models.room import RoomModel
from models.booking import BookingModel
from models.guest import GuestModel


class PropertyCard(QFrame):
    def __init__(self, prop_data, parent=None):
        super().__init__(parent)
        self.prop = prop_data
        self.setObjectName('card')
        self.setFixedHeight(260)
        self.init_ui()

    def init_ui(self):
        p = self.prop['property']
        s = self.prop['stats']
        t = self.prop['today']
        g = self.prop['growth']

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 16, 20, 16)
        layout.setSpacing(10)

        type_colors = {
            'hotel': '#3b82f6', 'resort': '#10b981',
            'villa': '#f59e0b', 'motel': '#8b5cf6', 'hostel': '#ec4899'
        }
        type_color = type_colors.get(p['type'], '#6b7280')

        top_row = QHBoxLayout()
        name = QLabel(p['name'])
        name.setStyleSheet(f"font-size: 16px; font-weight: 700; color: {type_color};")
        top_row.addWidget(name)

        type_badge = QLabel(p['type'].upper())
        type_badge.setStyleSheet(f"background-color: {type_color}22; color: {type_color}; border-radius: 8px; padding: 3px 8px; font-size: 9px; font-weight: 700;")
        top_row.addStretch()
        top_row.addWidget(type_badge)
        layout.addLayout(top_row)

        location = QLabel(f"\U0001f4cd {p['city']}, {p['state']}")
        location.setStyleSheet("font-size: 12px; color: #71717a;")
        layout.addWidget(location)

        sep = QFrame()
        sep.setObjectName('separator')
        sep.setFixedHeight(1)
        layout.addWidget(sep)

        metrics = QGridLayout()
        metrics.setSpacing(12)

        metric_data = [
            (f"\u20b9{s['total_revenue']:,.0f}", 'Total Revenue', '#10b981'),
            (f"{s['avg_occupancy']}%", 'Avg Occupancy', '#3b82f6'),
            (s['total_bookings'], 'Total Bookings', '#8b5cf6'),
            (f"\u20b9{t.get('total_revenue', 0):,.0f}", "Today's Rev", '#f59e0b'),
        ]

        for i, (value, label, color) in enumerate(metric_data):
            col = i % 2
            row = i // 2
            val_lbl = QLabel(str(value))
            val_lbl.setStyleSheet(f"font-size: 16px; font-weight: 700; color: {color};")
            metrics.addWidget(val_lbl, row, col * 2, 1, 1)
            lbl = QLabel(label)
            lbl.setStyleSheet("font-size: 10px; color: #71717a; text-transform: uppercase;")
            metrics.addWidget(lbl, row, col * 2 + 1, 1, 1)
        layout.addLayout(metrics)

        growth_row = QHBoxLayout()
        rev_growth = g['revenue_growth']
        growth_color = '#10b981' if rev_growth >= 0 else '#f87171'
        growth_icon = '\u2191' if rev_growth >= 0 else '\u2193'
        growth_lbl = QLabel(f"MoM Revenue: {growth_icon} {abs(rev_growth)}%")
        growth_lbl.setStyleSheet(f"font-size: 12px; font-weight: 600; color: {growth_color};")
        growth_row.addWidget(growth_lbl)

        occ_rate = t.get('occupancy_rate', 0)
        occ_bar = QProgressBar()
        occ_bar.setValue(int(occ_rate))
        occ_bar.setTextVisible(False)
        occ_bar.setFixedHeight(6)
        occ_bar.setStyleSheet(f"""
            QProgressBar {{ background-color: #1e2030; border: none; border-radius: 3px; }}
            QProgressBar::chunk {{ background-color: {type_color}; border-radius: 3px; }}
        """)
        occ_bar.setFixedWidth(80)
        occ_lbl = QLabel(f"{occ_rate}% occ")
        occ_lbl.setStyleSheet("font-size: 10px; color: #71717a;")
        growth_row.addStretch()
        growth_row.addWidget(occ_lbl)
        growth_row.addWidget(occ_bar)
        layout.addLayout(growth_row)


class ChainOverviewPage(QWidget):
    def __init__(self):
        super().__init__()
        self.prop_model = PropertyModel()
        self.room_model = RoomModel()
        self.booking_model = BookingModel()
        self.guest_model = GuestModel()
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        header = QHBoxLayout()
        title = QLabel('Chain Overview')
        title.setObjectName('title')
        header.addWidget(title)

        add_btn = QPushButton('+ Add Property')
        add_btn.clicked.connect(self.add_property_dialog)
        header.addWidget(add_btn)
        layout.addLayout(header)

        self.chain_stats_grid = QGridLayout()
        self.chain_stats_grid.setSpacing(12)
        layout.addLayout(self.chain_stats_grid)

        self.tabs = QTabWidget()
        layout.addWidget(self.tabs)

        self.properties_tab = QScrollArea()
        self.properties_tab.setWidgetResizable(True)
        self.properties_tab.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.properties_container = QWidget()
        self.properties_layout = QGridLayout(self.properties_container)
        self.properties_layout.setSpacing(16)
        self.properties_layout.setContentsMargins(0, 0, 0, 0)
        self.properties_tab.setWidget(self.properties_container)

        self.growth_tab = QScrollArea()
        self.growth_tab.setWidgetResizable(True)
        self.growth_tab.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.growth_container = QWidget()
        self.growth_layout = QVBoxLayout(self.growth_container)
        self.growth_layout.setContentsMargins(0, 0, 0, 0)
        self.growth_tab.setWidget(self.growth_container)

        self.ranking_tab = QWidget()
        self.ranking_layout = QVBoxLayout(self.ranking_tab)
        self.ranking_layout.setContentsMargins(0, 0, 0, 0)

        self.tabs.addTab(self.properties_tab, 'Properties')
        self.tabs.addTab(self.growth_tab, 'Growth Trends')
        self.tabs.addTab(self.ranking_tab, 'Rankings')

        self.refresh()

    def create_chain_stat(self, value, label, color='#2563eb'):
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
        while self.chain_stats_grid.count():
            item = self.chain_stats_grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        chain_stats = self.prop_model.get_stats()
        month_comp = self.prop_model.get_month_comparison()
        properties = self.prop_model.get_active()

        total_rooms = sum(p['total_rooms'] for p in properties)
        currency = '\u20b9'

        rev_growth = month_comp['revenue_growth']
        growth_color = '#10b981' if rev_growth >= 0 else '#f87171'
        growth_label = f"Revenue Growth ({'+' if rev_growth >= 0 else ''}{rev_growth}%)"

        stats = [
            (len(properties), 'Properties', '#ffffff'),
            (total_rooms, 'Total Rooms', '#3b82f6'),
            (f"{currency}{chain_stats['total_revenue']:,.0f}", 'All-Time Revenue', '#10b981'),
            (chain_stats['total_bookings'], 'Total Bookings', '#8b5cf6'),
            (f"{chain_stats['avg_occupancy']}%", 'Avg Occupancy', '#f59e0b'),
            (growth_label, 'MoM Change', growth_color),
        ]

        for i, (value, label, color) in enumerate(stats):
            row = i // 3
            col = i % 3
            self.chain_stats_grid.addWidget(self.create_chain_stat(value, label, color), row, col)

        self.refresh_properties()
        self.refresh_growth()
        self.refresh_rankings()

    def refresh_properties(self):
        while self.properties_layout.count():
            item = self.properties_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        rankings = self.prop_model.get_property_rankings()
        for i, r in enumerate(rankings):
            row = i // 2
            col = i % 2
            card = PropertyCard(r)
            self.properties_layout.addWidget(card, row, col)

    def refresh_growth(self):
        while self.growth_layout.count():
            item = self.growth_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        properties = self.prop_model.get_active()

        for prop in properties:
            group = QGroupBox(f"{prop['name']} - Last 7 Days Revenue")
            g_layout = QVBoxLayout(group)

            trend = self.prop_model.get_last_7_days(prop['id'])
            if trend:
                max_rev = max(t['total_revenue'] for t in trend) or 1

                for t in trend:
                    row = QHBoxLayout()
                    date_lbl = QLabel(t['date'][5:])
                    date_lbl.setStyleSheet("font-size: 11px; color: #71717a; min-width: 50px;")
                    row.addWidget(date_lbl)

                    bar_width = int((t['total_revenue'] / max_rev) * 300)
                    bar = QFrame()
                    bar.setStyleSheet(f"background-color: #3b82f6; border-radius: 3px; min-width: {bar_width}px; max-width: {bar_width}px; min-height: 16px; max-height: 16px;")
                    row.addWidget(bar)

                    rev_lbl = QLabel(f"\u20b9{t['total_revenue']:,.0f}")
                    rev_lbl.setStyleSheet("font-size: 11px; color: #a1a1aa; font-family: monospace; min-width: 80px;")
                    rev_lbl.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                    row.addWidget(rev_lbl)

                    occ_lbl = QLabel(f"{t['occupancy_rate']}% occ")
                    occ_lbl.setStyleSheet("font-size: 10px; color: #52525b; min-width: 60px;")
                    row.addWidget(occ_lbl)

                    g_layout.addLayout(row)
            else:
                g_layout.addWidget(QLabel('No data available'))

            self.growth_layout.addWidget(group)

        self.growth_layout.addStretch()

    def refresh_rankings(self):
        while self.ranking_layout.count():
            item = self.ranking_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        rankings = self.prop_model.get_property_rankings()

        table = QTableWidget()
        table.setColumnCount(9)
        table.setHorizontalHeaderLabels(['Rank', 'Property', 'Type', 'City', 'Total Revenue', 'Bookings', 'Avg Occupancy', "Today's Rev", 'MoM Growth'])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.verticalHeader().setVisible(False)
        table.setAlternatingRowColors(True)
        table.setRowCount(len(rankings))

        for i, r in enumerate(rankings):
            p = r['property']
            s = r['stats']
            t = r['today']
            g = r['growth']

            rank_item = QTableWidgetItem(f"#{i + 1}")
            if i == 0:
                rank_item.setForeground(Qt.GlobalColor.darkYellow)
            table.setItem(i, 0, rank_item)
            table.setItem(i, 1, QTableWidgetItem(p['name']))
            table.setItem(i, 2, QTableWidgetItem(p['type'].title()))
            table.setItem(i, 3, QTableWidgetItem(f"{p['city']}, {p['state']}"))
            table.setItem(i, 4, QTableWidgetItem(f"\u20b9{s['total_revenue']:,.0f}"))
            table.setItem(i, 5, QTableWidgetItem(str(s['total_bookings'])))
            table.setItem(i, 6, QTableWidgetItem(f"{s['avg_occupancy']}%"))
            table.setItem(i, 7, QTableWidgetItem(f"\u20b9{t.get('total_revenue', 0):,.0f}"))

            growth_val = g['revenue_growth']
            growth_str = f"+{growth_val}%" if growth_val >= 0 else f"{growth_val}%"
            growth_item = QTableWidgetItem(growth_str)
            if growth_val >= 0:
                growth_item.setForeground(Qt.GlobalColor.darkGreen)
            else:
                growth_item.setForeground(Qt.GlobalColor.darkRed)
            table.setItem(i, 8, growth_item)

        self.ranking_layout.addWidget(table)

    def add_property_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle('Add New Property')
        dialog.setFixedSize(450, 500)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(10)

        form = QGroupBox('Property Details')
        form_layout = QFormLayout(form)

        name = QLineEdit()
        form_layout.addRow('Property Name*:', name)

        prop_type = QComboBox()
        prop_type.addItems(['hotel', 'resort', 'villa', 'motel', 'hostel'])
        form_layout.addRow('Type:', prop_type)

        address = QLineEdit()
        form_layout.addRow('Address:', address)

        city = QLineEdit()
        form_layout.addRow('City:', city)

        state = QLineEdit()
        form_layout.addRow('State:', state)

        phone = QLineEdit()
        form_layout.addRow('Phone:', phone)

        email = QLineEdit()
        form_layout.addRow('Email:', email)

        gstin = QLineEdit()
        form_layout.addRow('GSTIN:', gstin)

        total_rooms = QSpinBox()
        total_rooms.setRange(1, 500)
        total_rooms.setValue(10)
        form_layout.addRow('Total Rooms:', total_rooms)

        layout.addWidget(form)

        def save():
            n = name.text().strip()
            if not n:
                QMessageBox.warning(dialog, 'Error', 'Property name required')
                return
            self.prop_model.create(
                name=n, prop_type=prop_type.currentText(),
                address=address.text().strip(), city=city.text().strip(),
                state=state.text().strip(), phone=phone.text().strip(),
                email=email.text().strip(), gstin=gstin.text().strip(),
                total_rooms=total_rooms.value()
            )
            self.refresh()
            dialog.accept()
            QMessageBox.information(dialog, 'Success', f'Property "{n}" added successfully!')

        btn = QPushButton('Add Property')
        btn.setObjectName('btnSuccess')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()
