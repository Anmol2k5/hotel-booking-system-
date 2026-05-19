import { Minus, Square, X } from 'lucide-react'

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
    }
  }
}

export default function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <div className="logo-dot" />
        <span>StayDesk PMS</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.electronAPI?.minimizeWindow()} title="Minimize">
          <Minus size={12} />
        </button>
        <button className="titlebar-btn" onClick={() => window.electronAPI?.maximizeWindow()} title="Maximize">
          <Square size={11} />
        </button>
        <button className="titlebar-btn close" onClick={() => window.electronAPI?.closeWindow()} title="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
