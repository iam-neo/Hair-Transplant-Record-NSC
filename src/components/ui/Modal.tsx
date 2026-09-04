"use client";
import { type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{title}</h2>
        {subtitle && <p className="subtle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger = false, busy = false }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <h2>{title}</h2>
        <p className="subtle">{message}</p>
        <div className="actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`button ${danger ? 'danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? 'Processing…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
