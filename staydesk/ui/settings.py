from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QGroupBox, QFormLayout, QLineEdit,
                              QMessageBox, QScrollArea, QFrame, QGridLayout)
from PyQt6.QtCore import Qt, QTimer
from database.db import Database


class SettingsPage(QWidget):
    def __init__(self):
        super().__init__()
        self.db = Database()
        self.init_ui()

    def init_ui(self):
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        title = QLabel('Settings')
        title.setObjectName('title')
        layout.addWidget(title)

        self.sync_card = QFrame()
        self.sync_card.setObjectName('statCard')
        self.sync_card.setFixedHeight(80)
        sync_layout = QHBoxLayout(self.sync_card)
        sync_layout.setContentsMargins(20, 12, 20, 12)

        self.sync_icon = QLabel('\U0001f4e1')
        self.sync_icon.setStyleSheet("font-size: 24px;")
        sync_layout.addWidget(self.sync_icon)

        sync_info = QVBoxLayout()
        self.sync_status_label = QLabel('Local Mode - No Cloud Sync')
        self.sync_status_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #fbbf24;")
        sync_info.addWidget(self.sync_status_label)
        self.sync_detail = QLabel('Data stored locally in SQLite database')
        self.sync_detail.setStyleSheet("font-size: 11px; color: #71717a;")
        sync_info.addWidget(self.sync_detail)
        sync_layout.addLayout(sync_info)

        sync_layout.addStretch()

        sync_queue_count = self.db.fetchone('SELECT COUNT(*) as c FROM sync_queue')['c']
        queue_label = QLabel(f"Queue: {sync_queue_count}")
        queue_label.setStyleSheet("font-size: 12px; color: #a1a1aa;")
        sync_layout.addWidget(queue_label)

        sync_now_btn = QPushButton('Sync Now')
        sync_now_btn.setObjectName('btnSecondary')
        sync_now_btn.setFixedWidth(100)
        sync_now_btn.clicked.connect(self.run_sync)
        sync_layout.addWidget(sync_now_btn)

        layout.addWidget(self.sync_card)

        self.property_group = QGroupBox('Property Information')
        p_layout = QFormLayout(self.property_group)

        self.prop_name = QLineEdit()
        p_layout.addRow('Property Name:', self.prop_name)

        self.prop_address = QLineEdit()
        p_layout.addRow('Address:', self.prop_address)

        self.prop_phone = QLineEdit()
        p_layout.addRow('Phone:', self.prop_phone)

        self.prop_gstin = QLineEdit()
        p_layout.addRow('GSTIN:', self.prop_gstin)

        layout.addWidget(self.property_group)

        self.billing_group = QGroupBox('Billing Configuration')
        b_layout = QFormLayout(self.billing_group)

        self.gst_rate = QLineEdit()
        self.gst_rate.setPlaceholderText('e.g., 12')
        b_layout.addRow('GST Rate (%):', self.gst_rate)

        self.currency = QLineEdit()
        self.currency.setFixedWidth(60)
        b_layout.addRow('Currency Symbol:', self.currency)

        self.check_in_time = QLineEdit()
        self.check_in_time.setPlaceholderText('14:00')
        self.check_in_time.setFixedWidth(100)
        b_layout.addRow('Check-in Time:', self.check_in_time)

        self.check_out_time = QLineEdit()
        self.check_out_time.setPlaceholderText('11:00')
        self.check_out_time.setFixedWidth(100)
        b_layout.addRow('Check-out Time:', self.check_out_time)

        layout.addWidget(self.billing_group)

        self.commission_group = QGroupBox('Commission Settings')
        c_layout = QFormLayout(self.commission_group)

        self.cleaning_commission = QLineEdit()
        self.cleaning_commission.setPlaceholderText('100')
        c_layout.addRow('Default Cleaning Commission (\u20b9):', self.cleaning_commission)

        self.fd_commission = QLineEdit()
        self.fd_commission.setPlaceholderText('2')
        c_layout.addRow('Default Front Desk Commission (%):', self.fd_commission)

        layout.addWidget(self.commission_group)

        self.system_group = QGroupBox('System Information')
        sys_layout = QFormLayout(self.system_group)
        sys_layout.addRow('Version:', QLabel('2.0.0 Enterprise'))
        sys_layout.addRow('Database:', QLabel('SQLite (better-sqlite3 compatible)'))
        sys_layout.addRow('Framework:', QLabel('PyQt6 + Python'))
        sys_layout.addRow('Rooms:', QLabel(str(self.db.fetchone('SELECT COUNT(*) as c FROM rooms')['c'])))
        sys_layout.addRow('Guests:', QLabel(str(self.db.fetchone('SELECT COUNT(*) as c FROM guests')['c'])))
        sys_layout.addRow('Staff:', QLabel(str(self.db.fetchone('SELECT COUNT(*) as c FROM staff_profiles')['c'])))
        layout.addWidget(self.system_group)

        save_btn = QPushButton('Save Settings')
        save_btn.setObjectName('btnSuccess')
        save_btn.setFixedWidth(200)
        save_btn.clicked.connect(self.save_settings)
        layout.addWidget(save_btn)

        layout.addStretch()
        scroll.setWidget(container)

        main_layout = QVBoxLayout(self)
        main_layout.addWidget(scroll)

        self.load_settings()

    def load_settings(self):
        settings = {}
        rows = self.db.fetchall('SELECT * FROM settings')
        for r in rows:
            settings[r['key']] = r['value']

        self.prop_name.setText(settings.get('property_name', ''))
        self.prop_address.setText(settings.get('property_address', ''))
        self.prop_phone.setText(settings.get('property_phone', ''))
        self.prop_gstin.setText(settings.get('property_gstin', ''))
        self.gst_rate.setText(settings.get('gst_rate', '12'))
        self.currency.setText(settings.get('currency', '\u20b9'))
        self.check_in_time.setText(settings.get('check_in_time', '14:00'))
        self.check_out_time.setText(settings.get('check_out_time', '11:00'))
        self.cleaning_commission.setText(settings.get('cleaning_commission', '100'))
        self.fd_commission.setText(settings.get('front_desk_commission_rate', '2'))

    def save_settings(self):
        settings_map = {
            'property_name': self.prop_name.text(),
            'property_address': self.prop_address.text(),
            'property_phone': self.prop_phone.text(),
            'property_gstin': self.prop_gstin.text(),
            'gst_rate': self.gst_rate.text(),
            'currency': self.currency.text(),
            'check_in_time': self.check_in_time.text(),
            'check_out_time': self.check_out_time.text(),
            'cleaning_commission': self.cleaning_commission.text(),
            'front_desk_commission_rate': self.fd_commission.text(),
        }

        for key, value in settings_map.items():
            self.db.execute(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                (key, value)
            )

        QMessageBox.information(self, 'Success', 'Settings saved successfully!')

    def run_sync(self):
        queue_count = self.db.fetchone('SELECT COUNT(*) as c FROM sync_queue')['c']
        if queue_count == 0:
            QMessageBox.information(self, 'Sync', 'No pending items to sync. All data is up to date.')
        else:
            QMessageBox.information(self, 'Sync', f"{queue_count} item(s) in sync queue. (Cloud sync requires Supabase configuration)")
