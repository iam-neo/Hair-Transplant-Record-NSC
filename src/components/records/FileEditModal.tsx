"use client";
import { useState, useEffect, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import type { PhotoRecord, DocumentRecord } from "@/types";

const STAGES = [
  "Before Transplant",
  "Day of Transplant",
  "After Transplant",
  "Follow-up 1 (1 Month)",
  "Follow-up 2 (3 Months)",
  "Follow-up 3 (6 Months)",
  "Follow-up 4 (1 Year)",
  "Follow-up",
  "Review",
  "Routine Visit",
  "Other",
];

const ANGLES = [
  "Front",
  "Top / Crown",
  "Left",
  "Right",
  "Back / Donor",
  "Other",
];

const DOC_TYPES = [
  "Consultation / OPD Card",
  "Blood Test",
  "Biopsy",
  "Consent Form",
  "Prescription",
  "Discharge Summary",
  "Other",
];

interface FileEditModalProps {
  open: boolean;
  onClose: () => void;
  item: PhotoRecord | DocumentRecord | null;
  type: "photo" | "document";
  token?: string;
  onSaved: () => void;
}

export function FileEditModal({
  open,
  onClose,
  item,
  type,
  token,
  onSaved,
}: FileEditModalProps) {
  const isPhoto = type === "photo";
  const photo = isPhoto ? (item as PhotoRecord) : null;
  const doc = !isPhoto ? (item as DocumentRecord) : null;

  const [sessionType, setSessionType] = useState("Before Transplant");
  const [category, setCategory] = useState("Front");
  const [photoDate, setPhotoDate] = useState("");
  const [documentType, setDocumentType] = useState("Other");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item) return;
    setError("");
    if (isPhoto) {
      const p = item as PhotoRecord;
      setSessionType(p.SessionType || "Before Transplant");
      setCategory(p.Category || "Front");
      setPhotoDate(p.PhotoDate ? String(p.PhotoDate).slice(0, 10) : String(p.CreatedAt || "").slice(0, 10));
      setNotes(p.Notes || "");
    } else {
      const d = item as DocumentRecord;
      setDocumentType(d.DocumentType || "Other");
      setNotes(d.Notes || "");
    }
  }, [item, isPhoto, open]);

  if (!open || !item) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError("");

    try {
      if (isPhoto) {
        await api(
          "photos.update",
          {
            photoId: (item as PhotoRecord).PhotoID,
            sessionType,
            category,
            photoDate,
            notes,
          },
          token
        );
      } else {
        await api(
          "documents.update",
          {
            documentId: (item as DocumentRecord).DocumentID,
            documentType,
            notes,
          },
          token
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1010 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(550px, 95vw)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "var(--navy)" }}>
            ✏️ Edit {isPhoto ? "Photo Info" : "Document Info"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: 0, fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
          File: <strong>{item.FileName}</strong> • Patient: <strong>{item.PatientID}</strong>
        </div>

        {error && <div className="form-error" style={{ marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isPhoto ? (
            <>
              <div className="grid2">
                <label className="field">
                  Timeline Stage
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  Anatomical Angle
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {ANGLES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field" style={{ marginTop: "12px" }}>
                Date Clicked / Taken
                <input
                  type="date"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <label className="field">
              Document Type
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field" style={{ marginTop: "12px" }}>
            Clinical Notes / Observations
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add or update observations..."
            />
          </label>

          <div className="actions" style={{ marginTop: "20px" }}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button"
              disabled={busy}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
