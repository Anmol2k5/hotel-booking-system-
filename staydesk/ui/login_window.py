from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                              QLineEdit, QPushButton, QWidget, QMessageBox)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont
from models.staff import StaffModel


class LoginWindow(QDialog):
    login_success = pyqtSignal(object)

    def __init__(self):
        super().__init__()
        self.staff_model = StaffModel()
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle('StayDesk - Login')
        self.setFixedSize(400, 420)
        self.setModal(True)
        self.setStyleSheet("""
            QDialog { background-color: #0f1117; }
            QLabel#logo { font-size: 36px; font-weight: 800; color: #ffffff; }
            QLabel#tagline { font-size: 14px; color: #71717a; margin-bottom: 30px; }
            QLabel#pinLabel { font-size: 12px; color: #a1a1aa; margin-bottom: 8px; }
            QLineEdit#pinInput {
                background-color: #1e2030;
                border: 2px solid #2a2d3a;
                border-radius: 12px;
                padding: 14px 20px;
                color: #ffffff;
                font-size: 28px;
                letter-spacing: 16px;
                text-align: center;
                font-weight: 700;
                margin-bottom: 20px;
            }
            QLineEdit#pinInput:focus { border-color: #3b82f6; }
            QPushButton#loginBtn {
                background-color: #2563eb;
                color: #ffffff;
                border: none;
                border-radius: 10px;
                padding: 12px;
                font-size: 15px;
                font-weight: 600;
            }
            QPushButton#loginBtn:hover { background-color: #3b82f6; }
            QPushButton#loginBtn:pressed { background-color: #1d4ed8; }
            QLabel#errorLabel { color: #f87171; font-size: 12px; margin-top: 8px; }
            QLabel#hint { color: #52525b; font-size: 11px; margin-top: 20px; }
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 50, 40, 40)
        layout.setSpacing(16)

        logo = QLabel('StayDesk')
        logo.setObjectName('logo')
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(logo)

        tagline = QLabel('Hotel Front Desk Management System')
        tagline.setObjectName('tagline')
        tagline.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(tagline)

        layout.addSpacing(20)

        pin_label = QLabel('Enter your 4-digit PIN')
        pin_label.setObjectName('pinLabel')
        pin_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(pin_label)

        self.pin_input = QLineEdit()
        self.pin_input.setObjectName('pinInput')
        self.pin_input.setMaxLength(4)
        self.pin_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pin_input.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.pin_input.returnPressed.connect(self.attempt_login)
        layout.addWidget(self.pin_input)

        self.login_btn = QPushButton('Sign In')
        self.login_btn.setObjectName('loginBtn')
        self.login_btn.clicked.connect(self.attempt_login)
        layout.addWidget(self.login_btn)

        self.error_label = QLabel('')
        self.error_label.setObjectName('errorLabel')
        self.error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.error_label)

        layout.addStretch()

        hint = QLabel('Demo PINs: Admin=1234, Priya=1111, Ram=3333')
        hint.setObjectName('hint')
        hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(hint)

        self.pin_input.setFocus()

    def attempt_login(self):
        pin = self.pin_input.text().strip()
        if len(pin) != 4:
            self.error_label.setText('Please enter a 4-digit PIN')
            return

        staff = self.staff_model.authenticate(pin)
        if staff:
            self.error_label.setText('')
            self.login_success.emit(dict(staff))
            self.accept()
        else:
            self.error_label.setText('Invalid PIN. Please try again.')
            self.pin_input.clear()
            self.pin_input.setFocus()
