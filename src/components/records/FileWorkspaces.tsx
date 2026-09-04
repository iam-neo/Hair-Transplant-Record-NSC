"use client";
import { type ChangeEvent, type DragEvent, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PatientSelect } from "@/components/ui/PatientSelect";
import type { Patient } from "@/types";

/* ─── Helpers ─── */
function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function previewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/* ─── Slot Definitions ─── */
const PHOTO_SLOTS = [
  { key: 'Front', label: 'Front', icon: '🧑' },
  { key: 'Top', label: 'Top', icon: '⬆️' },
  { key: 'Left', label: 'Left', icon: '◀️' },
  { key: 'Right', label: 'Right', icon: '▶️' },
  { key: 'Back / Donor', label: 'Back / Donor', icon: '🔙' },
  { key: 'Other', label: 'Other', icon: '📷' },
];

const DOCUMENT_SLOTS = [
  { key: 'Consultation / OPD Card', label: 'Consultation / OPD Card', icon: '🩺' },
  { key: 'Blood Test', label: 'Blood Test', icon: '🩸' },
  { key: 'Biopsy', label: 'Biopsy', icon: '🔬' },
  { key: 'Consent Form', label: 'Consent Form', icon: '📝' },
  { key: 'Prescription', label: 'Prescription', icon: '💊' },
  { key: 'Other', label: 'Other', icon: '📄' },
];

/* ─── Upload Slot Component ─── */
interface SlotFile {
  file: File;
  preview?: string;
}

type SlotStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

function UploadSlot({
  slotKey,
  label,
  icon,
  accept,
  slotFile,
  status,
  onFileSelect,
  onRemove,
}: {
  slotKey: string;
  label: string;
  icon: string;
  accept: string;
  slotFile: SlotFile | null;
  status: SlotStatus;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleClick = () => {
    if (!slotFile) inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = slotFile?.file.type.startsWith('image/');
  const className = [
    'upload-slot',
    dragOver ? 'dragover' : '',
    slotFile ? 'has-file' : '',
    status === 'uploading' ? 'uploading' : '',
    status === 'uploaded' ? 'uploaded' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      title={slotFile ? slotFile.file.name : `Click or drag to add ${label}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {slotFile ? (
        <>
          {isImage && slotFile.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slotFile.preview} alt={label} className="upload-slot-preview" />
          ) : (
            <div className="upload-slot-file-info">
              <span className="file-icon">{slotFile.file.type.includes('pdf') ? '📑' : '📎'}</span>
              <span className="file-name">{slotFile.file.name}</span>
            </div>
          )}
          <div className="upload-slot-overlay-label">
            {status === 'uploading' ? '⏳ Uploading…' : status === 'uploaded' ? '✅ Done' : label}
          </div>
          {status !== 'uploading' && (
            <button
              type="button"
              className="upload-slot-remove"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Remove file"
            >
              ×
            </button>
          )}
        </>
      ) : (
        <>
          <span className="upload-slot-icon">{icon}</span>
          <span className="upload-slot-label">{label}</span>
          <span className="upload-slot-hint">Click or drag</span>
        </>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function FilesWorkspace({ kind }: { kind: 'photos' | 'documents' }) {
  const photo = kind === 'photos';
  const slots = photo ? PHOTO_SLOTS : DOCUMENT_SLOTS;
  const accept = photo ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/*';

  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [, setSessions] = useState<Record<string, string>[]>([]);
  const [patientId, setPatientId] = useState('');
  const [sessionType, setSessionType] = useState('Other');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Per-slot files
  const [slotFiles, setSlotFiles] = useState<Record<string, SlotFile | null>>(() => {
    const init: Record<string, SlotFile | null> = {};
    (photo ? PHOTO_SLOTS : DOCUMENT_SLOTS).forEach(s => { init[s.key] = null; });
    return init;
  });

  // Per-slot upload status
  const [slotStatus, setSlotStatus] = useState<Record<string, SlotStatus>>(() => {
    const init: Record<string, SlotStatus> = {};
    (photo ? PHOTO_SLOTS : DOCUMENT_SLOTS).forEach(s => { init[s.key] = 'idle'; });
    return init;
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const s = sessionStore.get();

  const load = () => {
    if (s) {
      api<{ items: Record<string, string>[]; sessions?: Record<string, string>[] }>(photo ? 'photos.list' : 'documents.list', {}, s.token)
        .then(r => { setItems(r.items); setSessions(r.sessions || []); })
        .catch(e => setError(e.message));

      api<{ items: Patient[] }>('patients.list', { limit: 200 }, s.token)
        .then(res => setPatients(res.items || []))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== 'undefined') {
      const pId = new URLSearchParams(window.location.search).get('patientId');
      if (pId) setPatientId(pId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientMap = useMemo(() => {
    const map: Record<string, Patient> = {};
    patients.forEach(p => { map[p.id] = p; });
    return map;
  }, [patients]);

  const filledSlots = Object.entries(slotFiles).filter(([, v]) => v !== null);
  const filledCount = filledSlots.length;

  const setFileForSlot = (key: string, file: File) => {
    const preview = file.type.startsWith('image/') ? previewUrl(file) : undefined;
    setSlotFiles(prev => ({ ...prev, [key]: { file, preview } }));
    setSlotStatus(prev => ({ ...prev, [key]: 'idle' }));
    setFeedback('');
  };

  const removeFileFromSlot = (key: string) => {
    if (slotFiles[key]?.preview) URL.revokeObjectURL(slotFiles[key]!.preview!);
    setSlotFiles(prev => ({ ...prev, [key]: null }));
    setSlotStatus(prev => ({ ...prev, [key]: 'idle' }));
  };

  const resetAll = () => {
    Object.entries(slotFiles).forEach(([, v]) => {
      if (v?.preview) URL.revokeObjectURL(v.preview);
    });
    const init: Record<string, SlotFile | null> = {};
    const initStatus: Record<string, SlotStatus> = {};
    slots.forEach(sl => { init[sl.key] = null; initStatus[sl.key] = 'idle'; });
    setSlotFiles(init);
    setSlotStatus(initStatus);
    setNotes('');
    setUploadProgress({ current: 0, total: 0 });
  };

  async function uploadAll() {
    if (!s) return;
    if (!patientId) {
      setError('Please select a registered patient before uploading.');
      return;
    }
    if (filledCount === 0) {
      setError('Please add at least one file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setFeedback('');
    setUploadProgress({ current: 0, total: filledCount });

    let successCount = 0;
    let failCount = 0;

    for (const [key, slotFile] of filledSlots) {
      if (!slotFile) continue;
      setSlotStatus(prev => ({ ...prev, [key]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));

      try {
        const base64 = await asBase64(slotFile.file);
        if (photo) {
          await api('photos.upload', {
            patientId,
            base64,
            mimeType: slotFile.file.type,
            fileName: slotFile.file.name,
            extension: slotFile.file.name.split('.').pop(),
            sessionType,
            category: key,
            notes,
          }, s.token);
        } else {
          await api('documents.upload', {
            patientId,
            base64,
            mimeType: slotFile.file.type,
            fileName: slotFile.file.name,
            documentType: key,
            notes,
          }, s.token);
        }
        setSlotStatus(prev => ({ ...prev, [key]: 'uploaded' }));
        successCount++;
      } catch (e) {
        setSlotStatus(prev => ({ ...prev, [key]: 'error' }));
        failCount++;
        console.error(`Upload failed for ${key}:`, e);
      }
    }

    setUploading(false);

    if (failCount === 0) {
      setFeedback(`✅ All ${successCount} file(s) uploaded successfully to Google Drive!`);
      setTimeout(() => { resetAll(); load(); }, 1500);
    } else {
      setError(`${failCount} file(s) failed to upload. ${successCount} succeeded. Please retry the failed ones.`);
      load();
    }
  }

  async function doDelete() {
    if (!deleteTarget || !s) return;
    setDeleteBusy(true);
    try {
      await api(photo ? 'photos.delete' : 'documents.delete', photo ? { photoId: deleteTarget.id } : { documentId: deleteTarget.id }, s.token);
      setDeleteTarget(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); setDeleteTarget(null); }
    finally { setDeleteBusy(false); }
  }

  return (
    <AppShell title={photo ? 'Photos' : 'Documents'}>
      <div className="page-title">
        <div>
          <h2>{photo ? 'Photo documentation' : 'Patient documents'}</h2>
          <p className="subtle">Files are uploaded directly to private patient folders in Google Drive.</p>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#e7f7ef', color: 'var(--success)', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {feedback}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      {/* Upload Section */}
      <section className="panel">
        <h3>{photo ? '📸 Upload patient photos' : '📄 Upload patient documents'}</h3>
        <p className="subtle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          {photo
            ? 'Select a patient, then add photos for each angle. You can drag-and-drop or click each square to browse.'
            : 'Select a patient, then add documents for each category. You can drag-and-drop or click each square to browse.'}
        </p>

        {/* Patient & Session Selection */}
        <div className="grid2" style={{ marginBottom: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <PatientSelect
              value={patientId}
              onChange={(id) => setPatientId(id)}
              required
              initialPatients={patients}
              label="Select Registered Patient"
              placeholder="Type patient name, phone number, or ID to attach files to..."
            />
          </div>
          {photo && (
            <label className="field" style={{ marginTop: '8px' }}>
              Session type
              <select value={sessionType} onChange={e => setSessionType(e.target.value)}>
                {['Before Transplant', 'Day of Transplant', 'After Transplant', 'Follow-up', 'Review', 'Routine Visit', 'Other'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          )}
        </div>

        {/* Upload Slots Grid */}
        <div className="upload-grid">
          {slots.map(slot => (
            <UploadSlot
              key={slot.key}
              slotKey={slot.key}
              label={slot.label}
              icon={slot.icon}
              accept={accept}
              slotFile={slotFiles[slot.key]}
              status={slotStatus[slot.key]}
              onFileSelect={(file) => setFileForSlot(slot.key, file)}
              onRemove={() => removeFileFromSlot(slot.key)}
            />
          ))}
        </div>

        {/* Notes */}
        <label className="field" style={{ marginTop: '12px' }}>
          Notes (optional — applies to all uploads)
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this upload batch..." />
        </label>

        {/* Upload Progress */}
        {uploading && (
          <div style={{ marginTop: '12px' }}>
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
            </div>
            <div className="upload-status">
              <span>⏳</span>
              <span>Uploading {uploadProgress.current} of {uploadProgress.total}...</span>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '16px' }}>
          <button
            className="button"
            disabled={!patientId || filledCount === 0 || uploading}
            onClick={uploadAll}
          >
            {uploading
              ? `Uploading ${uploadProgress.current}/${uploadProgress.total}…`
              : `Upload ${filledCount} ${photo ? 'photo' : 'document'}${filledCount !== 1 ? 's' : ''} securely`}
          </button>
          {filledCount > 0 && !uploading && (
            <button type="button" className="button secondary" onClick={resetAll}>
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Files Register Table */}
      <section className="panel">
        <h3>{photo ? 'Photo' : 'Document'} register</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>File</th>
                <th>Type</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map(x => (
                <tr key={x.PhotoID || x.DocumentID}>
                  <td>
                    <strong style={{ color: 'var(--navy)' }}>{x.PatientID}</strong>
                    {patientMap[x.PatientID] && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                        {patientMap[x.PatientID].fullName}
                      </div>
                    )}
                  </td>
                  <td>{x.FileName}</td>
                  <td>{x.Category || x.DocumentType}</td>
                  <td>{x.CreatedAt}</td>
                  <td className="row-actions">
                    <button className="btn-icon" title="Delete" onClick={() => setDeleteTarget({ id: x.PhotoID || x.DocumentID, label: x.FileName })}>🗑️</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="empty">No files yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete ${photo ? 'photo' : 'document'}`}
        message={`Are you sure you want to permanently delete "${deleteTarget?.label}"? The file will also be removed from Google Drive.`}
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
      />
    </AppShell>
  );
}
