from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                              QPushButton, QTableWidget, QTableWidgetItem,
                              QHeaderView, QDialog, QLineEdit, QComboBox,
                              QMessageBox, QGroupBox, QFormLayout, QSpinBox,
                              QDoubleSpinBox)
from PyQt6.QtCore import Qt
from models.staff import StaffModel


class StaffPage(QWidget):
    def __init__(self):
        super().__init__()
        self.staff_model = StaffModel()
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        header = QHBoxLayout()
        title = QLabel('Staff Management')
        title.setObjectName('title')
        header.addWidget(title)

        new_btn = QPushButton('+ Add Staff')
        new_btn.clicked.connect(self.add_staff_dialog)
        header.addWidget(new_btn)
        layout.addLayout(header)

        self.table = QTableWidget()
        self.table.setColumnCount(9)
        self.table.setHorizontalHeaderLabels(['Name', 'Role', 'Phone', 'Base Salary', 'Comm. Rate', 'Clean Comm.', 'Earned', 'Status', 'Actions'])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)

        self.refresh()

    def refresh(self):
        staff = self.staff_model.get_all()
        self.table.setRowCount(len(staff))
        for i, s in enumerate(staff):
            self.table.setItem(i, 0, QTableWidgetItem(s['username']))
            self.table.setItem(i, 1, QTableWidgetItem(s['role'].upper()))
            self.table.setItem(i, 2, QTableWidgetItem(s['phone'] or '-'))
            self.table.setItem(i, 3, QTableWidgetItem(f"\u20b9{s['base_salary']:,.0f}"))
            self.table.setItem(i, 4, QTableWidgetItem(f"{s['commission_rate']}%"))
            self.table.setItem(i, 5, QTableWidgetItem(f"\u20b9{s['cleaning_commission']:,.0f}"))

            earned_item = QTableWidgetItem(f"\u20b9{s['earned_commission']:,.0f}")
            if s['earned_commission'] > 0:
                earned_item.setForeground(Qt.GlobalColor.darkGreen)
            self.table.setItem(i, 6, earned_item)

            self.table.setItem(i, 7, QTableWidgetItem('Active' if s['active'] else 'Inactive'))

            edit_btn = QPushButton('Edit')
            edit_btn.setFixedWidth(60)
            edit_btn.clicked.connect(lambda checked, sid=s['id']: self.edit_staff_dialog(sid))
            self.table.setCellWidget(i, 8, edit_btn)

    def add_staff_dialog(self):
        self.staff_form_dialog()

    def edit_staff_dialog(self, staff_id):
        staff = self.staff_model.get_by_id(staff_id)
        if staff:
            self.staff_form_dialog(guest=dict(staff))

    def staff_form_dialog(self, guest=None):
        dialog = QDialog(self)
        dialog.setWindowTitle('Edit Staff' if guest else 'Add Staff')
        dialog.setFixedSize(400, 450)
        dialog.setStyleSheet(self.parent().styleSheet() if self.parent() else '')

        layout = QVBoxLayout(dialog)
        layout.setSpacing(10)

        form = QGroupBox('Staff Details')
        form_layout = QFormLayout(form)

        username = QLineEdit(guest['username'] if guest else '')
        form_layout.addRow('Name:', username)

        pin = QLineEdit(guest['pin_code'] if guest else '')
        pin.setMaxLength(4)
        form_layout.addRow('PIN (4 digits):', pin)

        role = QComboBox()
        role.addItems(['front_desk', 'housekeeping', 'manager', 'admin'])
        if guest:
            idx = role.findText(guest['role'])
            if idx >= 0:
                role.setCurrentIndex(idx)
        form_layout.addRow('Role:', role)

        phone = QLineEdit(guest['phone'] if guest else '')
        form_layout.addRow('Phone:', phone)

        base_salary = QDoubleSpinBox()
        base_salary.setRange(0, 999999)
        base_salary.setValue(guest['base_salary'] if guest else 0)
        form_layout.addRow('Base Salary:', base_salary)

        comm_rate = QDoubleSpinBox()
        comm_rate.setRange(0, 100)
        comm_rate.setSuffix('%')
        comm_rate.setValue(guest['commission_rate'] if guest else 0)
        form_layout.addRow('Booking Commission:', comm_rate)

        clean_comm = QDoubleSpinBox()
        clean_comm.setRange(0, 99999)
        clean_comm.setValue(guest['cleaning_commission'] if guest else 0)
        form_layout.addRow('Cleaning Commission:', clean_comm)

        layout.addWidget(form)

        def save():
            name = username.text().strip()
            pin_code = pin.text().strip()
            if not name or len(pin_code) != 4:
                QMessageBox.warning(dialog, 'Error', 'Name and 4-digit PIN required')
                return

            data = {
                'username': name, 'pin_code': pin_code,
                'role': role.currentText(),
                'phone': phone.text().strip(),
                'base_salary': base_salary.value(),
                'commission_rate': comm_rate.value(),
                'cleaning_commission': clean_comm.value(),
            }

            if guest:
                self.staff_model.update(guest['id'], **data)
            else:
                self.staff_model.create(**data)

            self.refresh()
            dialog.accept()

        btn = QPushButton('Save')
        btn.setObjectName('btnSuccess')
        btn.clicked.connect(save)
        layout.addWidget(btn)
        dialog.exec()
