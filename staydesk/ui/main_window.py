from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                              QLabel, QPushButton, QStackedWidget, QFrame,
                              QScrollArea, QComboBox, QMessageBox)
from PyQt6.QtCore import Qt, QTimer
from datetime import datetime
from models.property import PropertyModel

from ui.dashboard import DashboardPage
from ui.rooms import RoomsPage
from ui.bookings import BookingsPage
from ui.guests import GuestsPage
from ui.housekeeping import HousekeepingPage
from ui.staff import StaffPage
from ui.settings import SettingsPage
from ui.checkin import CheckInPage
from ui.checkout import CheckOutPage
from ui.chain_overview import ChainOverviewPage

NAV_ITEMS = [
    ('Chain Overview', 'chain'),
    ('Dashboard', 'dashboard'),
    ('Check-In', 'checkin'),
    ('Check-Out', 'checkout'),
    ('Rooms', 'rooms'),
    ('Bookings', 'bookings'),
    ('Guests', 'guests'),
    ('Housekeeping', 'housekeeping'),
    ('Staff', 'staff'),
    ('Settings', 'settings'),
]

ROLE_PERMISSIONS = {
    'admin': ['chain', 'dashboard', 'checkin', 'checkout', 'rooms', 'bookings', 'guests', 'housekeeping', 'staff', 'settings'],
    'manager': ['chain', 'dashboard', 'checkin', 'checkout', 'rooms', 'bookings', 'guests', 'housekeeping', 'staff', 'settings'],
    'front_desk': ['dashboard', 'checkin', 'checkout', 'rooms', 'bookings', 'guests'],
    'housekeeping': ['dashboard', 'housekeeping'],
}


class MainWindow(QMainWindow):
    def __init__(self, staff):
        super().__init__()
        self.staff = staff
        self.prop_model = PropertyModel()
        self.current_property_id = None
        self._load_active_property()
        self.setWindowTitle('StayDesk - Hotel Front Desk Management')
        self.resize(1400, 850)
        self.setMinimumSize(1100, 700)
        self.init_ui()

    def _load_active_property(self):
        row = self.prop_model.db.fetchone("SELECT value FROM settings WHERE key = 'active_property_id'")
        if row and row['value']:
            self.current_property_id = row['value']
        else:
            props = self.prop_model.get_active()
            self.current_property_id = props[0]['id'] if props else None

    def init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        self.sidebar = self.build_sidebar()
        main_layout.addWidget(self.sidebar)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)

        self.header = self.build_header()
        content_layout.addWidget(self.header)

        sep = QFrame()
        sep.setObjectName('separator')
        sep.setFixedHeight(1)
        content_layout.addWidget(sep)

        self.stack = QStackedWidget()
        content_layout.addWidget(self.stack)

        self.pages = {}
        self.nav_buttons = {}

        self.add_page('chain', 'Chain Overview', ChainOverviewPage())
        self.add_page('dashboard', 'Dashboard', DashboardPage())
        self.add_page('checkin', 'Check-In', CheckInPage(self.staff))
        self.add_page('checkout', 'Check-Out', CheckOutPage(self.staff))
        self.add_page('rooms', 'Room Management', RoomsPage())
        self.add_page('bookings', 'Bookings', BookingsPage(self.staff))
        self.add_page('guests', 'Guests', GuestsPage())
        self.add_page('housekeeping', 'Housekeeping', HousekeepingPage(self.staff))
        self.add_page('staff', 'Staff Management', StaffPage())
        self.add_page('settings', 'Settings', SettingsPage())

        allowed = ROLE_PERMISSIONS.get(self.staff['role'], [])
        for key in NAV_ITEMS:
            if key[1] not in allowed:
                btn = self.nav_buttons.get(key[1])
                if btn:
                    btn.setVisible(False)

        self.sidebar.setStyleSheet("""
            QWidget#sidebarWidget {
                background-color: #161822;
            }
            QPushButton#navBtn {
                background-color: transparent;
                color: #a1a1aa;
                text-align: left;
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                margin: 2px 8px;
                min-height: 36px;
            }
            QPushButton#navBtn:hover {
                background-color: #1e2030;
                color: #e4e4e7;
            }
            QPushButton#navBtn:checked {
                background-color: #2563eb;
                color: #ffffff;
                font-weight: 600;
            }
            QLabel#logoLabel {
                color: #ffffff;
                font-size: 22px;
                font-weight: 800;
                padding: 20px 20px 4px 20px;
            }
            QLabel#versionLabel {
                color: #52525b;
                font-size: 10px;
                padding: 0 20px 8px 20px;
            }
            QFrame#sidebarSep {
                background-color: #2a2d3a;
                max-height: 1px;
            }
            QLabel#sectionLabel {
                color: #52525b;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                padding: 12px 20px 4px 20px;
                font-weight: 600;
            }
            QLabel#clockLabel {
                color: #ffffff;
                font-size: 18px;
                font-weight: 700;
                font-family: monospace;
                padding: 8px 20px 2px 20px;
            }
            QLabel#dateLabel {
                color: #71717a;
                font-size: 11px;
                padding: 0 20px 16px 20px;
            }
            QComboBox#propertyCombo {
                background-color: #1e2030;
                border: 1px solid #2a2d3a;
                border-radius: 8px;
                padding: 6px 10px;
                color: #e4e4e7;
                font-size: 12px;
                margin: 4px 12px;
            }
            QComboBox#propertyCombo::drop-down {
                border: none;
                padding-right: 6px;
            }
            QComboBox#propertyCombo QAbstractItemView {
                background-color: #1e2030;
                color: #e4e4e7;
                border: 1px solid #2a2d3a;
                selection-background-color: #2563eb;
            }
        """)

        self.header.setStyleSheet("""
            QFrame#headerFrame {
                background-color: #161822;
                border-bottom: 1px solid #2a2d3a;
                padding: 12px 24px;
            }
            QLabel#headerPageTitle {
                color: #ffffff;
                font-size: 16px;
                font-weight: 600;
            }
            QLabel#currentPropLabel {
                background-color: #1e2030;
                border: 1px solid #2a2d3a;
                border-radius: 20px;
                padding: 6px 14px;
                color: #3b82f6;
                font-size: 12px;
                font-weight: 600;
            }
            QLabel#userBadge {
                background-color: #1e2030;
                border: 1px solid #2a2d3a;
                border-radius: 20px;
                padding: 6px 14px;
                color: #a1a1aa;
                font-size: 12px;
            }
            QPushButton#logoutBtn {
                background-color: transparent;
                color: #f87171;
                border: 1px solid #450a0a;
                border-radius: 8px;
                padding: 6px 14px;
                font-size: 12px;
            }
            QPushButton#logoutBtn:hover {
                background-color: #450a0a;
            }
        """)

        self.start_clock()
        self.switch_page('chain' if 'chain' in allowed else 'dashboard')

    def build_sidebar(self):
        sidebar = QFrame()
        sidebar.setObjectName('sidebarWidget')
        sidebar.setFixedWidth(240)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        logo = QLabel('StayDesk')
        logo.setObjectName('logoLabel')
        layout.addWidget(logo)

        version = QLabel('v2.0 Enterprise')
        version.setObjectName('versionLabel')
        layout.addWidget(version)

        properties = self.prop_model.get_active()
        if len(properties) > 1:
            self.prop_combo = QComboBox()
            self.prop_combo.setObjectName('propertyCombo')
            for p in properties:
                self.prop_combo.addItem(f"{p['name']} ({p['city']})", p['id'])
            if self.current_property_id:
                idx = self.prop_combo.findData(self.current_property_id)
                if idx >= 0:
                    self.prop_combo.setCurrentIndex(idx)
            self.prop_combo.currentIndexChanged.connect(self.on_property_changed)
            layout.addWidget(self.prop_combo)

        sep = QFrame()
        sep.setObjectName('sidebarSep')
        sep.setFixedHeight(1)
        layout.addWidget(sep)

        nav_label = QLabel('Navigation')
        nav_label.setObjectName('sectionLabel')
        layout.addWidget(nav_label)

        nav_keys = ['chain', 'dashboard', 'checkin', 'checkout', 'rooms', 'bookings', 'guests']
        for label, key in NAV_ITEMS:
            if key in nav_keys:
                btn = QPushButton(f'  {label}')
                btn.setObjectName('navBtn')
                btn.setCheckable(True)
                btn.clicked.connect(lambda checked, k=key: self.switch_page(k))
                self.nav_buttons[key] = btn
                layout.addWidget(btn)

        sep2 = QFrame()
        sep2.setObjectName('sidebarSep')
        sep2.setFixedHeight(1)
        layout.addWidget(sep2)

        sys_label = QLabel('System')
        sys_label.setObjectName('sectionLabel')
        layout.addWidget(sys_label)

        sys_keys = ['housekeeping', 'staff', 'settings']
        for label, key in NAV_ITEMS:
            if key in sys_keys:
                btn = QPushButton(f'  {label}')
                btn.setObjectName('navBtn')
                btn.setCheckable(True)
                btn.clicked.connect(lambda checked, k=key: self.switch_page(k))
                self.nav_buttons[key] = btn
                layout.addWidget(btn)

        layout.addStretch()

        self.clock_label = QLabel('')
        self.clock_label.setObjectName('clockLabel')
        self.clock_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.clock_label)

        self.date_label = QLabel('')
        self.date_label.setObjectName('dateLabel')
        self.date_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.date_label)

        return sidebar

    def build_header(self):
        header = QFrame()
        header.setObjectName('headerFrame')
        layout = QHBoxLayout(header)
        layout.setContentsMargins(24, 12, 24, 12)

        self.page_title = QLabel('Dashboard')
        self.page_title.setObjectName('headerPageTitle')
        layout.addWidget(self.page_title)

        layout.addStretch()

        if self.current_property_id:
            prop = self.prop_model.get_by_id(self.current_property_id)
            if prop:
                prop_lbl = QLabel(f"\U0001f3e8 {prop['name']}")
                prop_lbl.setObjectName('currentPropLabel')
                layout.addWidget(prop_lbl)

        role_display = self.staff['role'].replace('_', ' ').title()
        user_badge = QLabel(f"\U0001f464 {self.staff['username']} ({role_display})")
        user_badge.setObjectName('userBadge')
        layout.addWidget(user_badge)

        logout_btn = QPushButton('Switch User')
        logout_btn.setObjectName('logoutBtn')
        logout_btn.clicked.connect(self.logout)
        layout.addWidget(logout_btn)

        return header

    def add_page(self, key, title, widget):
        self.pages[key] = widget
        self.stack.addWidget(widget)

    def switch_page(self, key):
        if key not in self.pages:
            return

        for k, btn in self.nav_buttons.items():
            btn.setChecked(k == key)

        self.stack.setCurrentWidget(self.pages[key])
        self.page_title.setText(key.replace('_', ' ').title())

        if hasattr(self.pages[key], 'refresh'):
            self.pages[key].refresh()

    def on_property_changed(self, index):
        prop_id = self.prop_combo.itemData(index)
        if prop_id:
            self.current_property_id = prop_id
            self.prop_model.db.execute(
                "UPDATE settings SET value = ? WHERE key = 'active_property_id'",
                (prop_id,)
            )
            prop = self.prop_model.get_by_id(prop_id)
            if prop:
                prop_lbl = self.header.findChild(QLabel, 'currentPropLabel')
                if prop_lbl:
                    prop_lbl.setText(f"\U0001f3e8 {prop['name']}")
            self.refresh_all_pages()

    def refresh_all_pages(self):
        for key, page in self.pages.items():
            if hasattr(page, 'refresh'):
                page.refresh()

    def start_clock(self):
        self.clock_timer = QTimer(self)
        self.clock_timer.timeout.connect(self.update_clock)
        self.clock_timer.start(1000)
        self.update_clock()

    def update_clock(self):
        now = datetime.now()
        self.clock_label.setText(now.strftime('%H:%M:%S'))
        self.date_label.setText(now.strftime('%a, %d %b %Y'))

    def logout(self):
        from ui.login_window import LoginWindow
        login = LoginWindow()
        login.login_success.connect(self.on_relogin)
        if login.exec():
            pass

    def on_relogin(self, staff):
        self.staff = staff
        role_display = staff['role'].replace('_', ' ').title()
        badge = self.header.findChild(QLabel, 'userBadge')
        if badge:
            badge.setText(f"\U0001f464 {staff['username']} ({role_display})")

        allowed = ROLE_PERMISSIONS.get(staff['role'], [])
        for key, btn in self.nav_buttons.items():
            btn.setVisible(key in allowed)

        if 'chain' in allowed:
            self.switch_page('chain')
        elif 'dashboard' in allowed:
            self.switch_page('dashboard')
        elif allowed:
            self.switch_page(allowed[0])
