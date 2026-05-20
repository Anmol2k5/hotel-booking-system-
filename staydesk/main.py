import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont, QIcon
from PyQt6.QtCore import Qt

from database.db import Database
from ui.login_window import LoginWindow
from ui.main_window import MainWindow
from ui.styles import STYLESHEET


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')

    app.setFont(QFont('Segoe UI', 10))

    db = Database()

    login = LoginWindow()

    def on_login_success(staff):
        window = MainWindow(staff)
        window.show()

    login.login_success.connect(on_login_success)

    if login.exec():
        pass

    sys.exit(app.exec())


if __name__ == '__main__':
    main()
