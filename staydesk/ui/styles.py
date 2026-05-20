STYLESHEET = """
/* ===== GLOBAL ===== */
* {
    font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

QWidget {
    background-color: #0f1117;
    color: #e4e4e7;
    font-size: 13px;
}

/* ===== SIDEBAR ===== */
QFrame#sidebar {
    background-color: #161822;
    border-right: 1px solid #2a2d3a;
}

QFrame#sidebar QPushButton {
    background-color: transparent;
    color: #a1a1aa;
    text-align: left;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin: 2px 8px;
}

QFrame#sidebar QPushButton:hover {
    background-color: #1e2030;
    color: #e4e4e7;
}

QFrame#sidebar QPushButton:checked,
QFrame#sidebar QPushButton#activeBtn {
    background-color: #2563eb;
    color: #ffffff;
    font-weight: 600;
}

QFrame#sidebar QPushButton::menu-indicator {
    subcontrol-origin: padding;
    subcontrol-position: center right;
}

QLabel#sidebarTitle {
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
    padding: 16px;
}

QLabel#sidebarSubtitle {
    color: #71717a;
    font-size: 11px;
    padding: 0 16px 16px 16px;
}

/* ===== HEADER ===== */
QFrame#header {
    background-color: #161822;
    border-bottom: 1px solid #2a2d3a;
}

QLabel#headerTitle {
    color: #ffffff;
    font-size: 16px;
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

/* ===== CARDS ===== */
QFrame#card {
    background-color: #1a1d2e;
    border: 1px solid #2a2d3a;
    border-radius: 12px;
}

QFrame#statCard {
    background-color: #1a1d2e;
    border: 1px solid #2a2d3a;
    border-radius: 12px;
}

QFrame#statCard:hover {
    border-color: #3b82f6;
}

/* ===== BUTTONS ===== */
QPushButton {
    background-color: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
}

QPushButton:hover {
    background-color: #3b82f6;
}

QPushButton:pressed {
    background-color: #1d4ed8;
}

QPushButton:disabled {
    background-color: #2a2d3a;
    color: #71717a;
}

QPushButton#btnSecondary {
    background-color: #1e2030;
    border: 1px solid #2a2d3a;
}

QPushButton#btnSecondary:hover {
    background-color: #2a2d3a;
}

QPushButton#btnSuccess {
    background-color: #059669;
}

QPushButton#btnSuccess:hover {
    background-color: #10b981;
}

QPushButton#btnDanger {
    background-color: #dc2626;
}

QPushButton#btnDanger:hover {
    background-color: #ef4444;
}

QPushButton#btnWarning {
    background-color: #d97706;
}

QPushButton#btnWarning:hover {
    background-color: #f59e0b;
}

/* ===== INPUTS ===== */
QLineEdit {
    background-color: #1e2030;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 8px 12px;
    color: #e4e4e7;
    font-size: 13px;
}

QLineEdit:focus {
    border-color: #3b82f6;
}

QLineEdit:disabled {
    background-color: #161822;
    color: #71717a;
}

QComboBox {
    background-color: #1e2030;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 8px 12px;
    color: #e4e4e7;
    font-size: 13px;
}

QComboBox::drop-down {
    border: none;
    padding-right: 8px;
}

QComboBox QAbstractItemView {
    background-color: #1e2030;
    color: #e4e4e7;
    border: 1px solid #2a2d3a;
    selection-background-color: #2563eb;
}

QTextEdit, QPlainTextEdit {
    background-color: #1e2030;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 8px 12px;
    color: #e4e4e7;
    font-size: 13px;
}

QTextEdit:focus, QPlainTextEdit:focus {
    border-color: #3b82f6;
}

/* ===== TABLE ===== */
QTableWidget {
    background-color: #1a1d2e;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    gridline-color: #2a2d3a;
    font-size: 12px;
}

QTableWidget::item {
    padding: 8px;
    border-bottom: 1px solid #2a2d3a;
}

QTableWidget::item:selected {
    background-color: #1e3a5f;
    color: #e4e4e7;
}

QHeaderView::section {
    background-color: #161822;
    color: #a1a1aa;
    padding: 10px 8px;
    border: none;
    border-bottom: 2px solid #2a2d3a;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
}

/* ===== SCROLLBAR ===== */
QScrollBar:vertical {
    background-color: #161822;
    width: 8px;
    border-radius: 4px;
}

QScrollBar::handle:vertical {
    background-color: #2a2d3a;
    border-radius: 4px;
    min-height: 30px;
}

QScrollBar::handle:vertical:hover {
    background-color: #3b82f6;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    background-color: #161822;
    height: 8px;
    border-radius: 4px;
}

QScrollBar::handle:horizontal {
    background-color: #2a2d3a;
    border-radius: 4px;
    min-width: 30px;
}

/* ===== LABELS ===== */
QLabel {
    color: #e4e4e7;
}

QLabel#title {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
}

QLabel#subtitle {
    font-size: 12px;
    color: #71717a;
}

QLabel#statValue {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
}

QLabel#statLabel {
    font-size: 11px;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

QLabel#sectionTitle {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
}

/* ===== BADGES ===== */
QLabel#badgeAvailable {
    background-color: #064e3b;
    color: #34d399;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeOccupied {
    background-color: #1e3a5f;
    color: #60a5fa;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeCheckout {
    background-color: #451a03;
    color: #fbbf24;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeMaintenance {
    background-color: #450a0a;
    color: #f87171;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeReserved {
    background-color: #3b0764;
    color: #c084fc;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeConfirmed {
    background-color: #064e3b;
    color: #34d399;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeCheckedIn {
    background-color: #1e3a5f;
    color: #60a5fa;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

QLabel#badgeCheckedOut {
    background-color: #451a03;
    color: #fbbf24;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
}

/* ===== LOGIN WINDOW ===== */
QFrame#loginFrame {
    background-color: #0f1117;
    border-radius: 16px;
}

QLabel#loginTitle {
    font-size: 28px;
    font-weight: 700;
    color: #ffffff;
}

QLabel#loginSubtitle {
    font-size: 14px;
    color: #71717a;
}

QLineEdit#pinInput {
    background-color: #1e2030;
    border: 2px solid #2a2d3a;
    border-radius: 12px;
    padding: 14px 20px;
    color: #ffffff;
    font-size: 24px;
    letter-spacing: 12px;
    text-align: center;
    font-weight: 600;
}

QLineEdit#pinInput:focus {
    border-color: #3b82f6;
}

/* ===== DIALOG ===== */
QDialog {
    background-color: #161822;
}

QDialog QLabel {
    color: #e4e4e7;
}

/* ===== PROGRESS BAR ===== */
QProgressBar {
    background-color: #1e2030;
    border: 1px solid #2a2d3a;
    border-radius: 4px;
    text-align: center;
    height: 6px;
}

QProgressBar::chunk {
    background-color: #2563eb;
    border-radius: 4px;
}

/* ===== TAB WIDGET ===== */
QTabWidget::pane {
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    background-color: #1a1d2e;
}

QTabBar::tab {
    background-color: #161822;
    color: #71717a;
    padding: 8px 16px;
    border: 1px solid #2a2d3a;
    border-bottom: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    font-size: 12px;
    font-weight: 500;
}

QTabBar::tab:selected {
    background-color: #1a1d2e;
    color: #ffffff;
    border-bottom: 2px solid #2563eb;
}

QTabBar::tab:hover:!selected {
    background-color: #1e2030;
    color: #a1a1aa;
}

/* ===== GROUP BOX ===== */
QGroupBox {
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    margin-top: 12px;
    padding-top: 16px;
    font-weight: 600;
    color: #ffffff;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: #a1a1aa;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* ===== SEPARATOR ===== */
QFrame#separator {
    background-color: #2a2d3a;
    max-height: 1px;
}

/* ===== TOOLTIP ===== */
QToolTip {
    background-color: #1e2030;
    color: #e4e4e7;
    border: 1px solid #2a2d3a;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
}
"""
