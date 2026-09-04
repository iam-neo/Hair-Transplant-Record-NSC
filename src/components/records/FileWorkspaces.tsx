"use client";
import { type ChangeEvent, type DragEvent, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PatientSelect } from "@/components/ui/PatientSelect";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileEditModal } from "./FileEditModal";
import { TimelineMatrix } from "./TimelineMatrix";
import { DocumentDossier } from "./DocumentDossier";
import type { Patient, PhotoRecord, DocumentRecord } from "@/types";

/* ─── Helpers ─── */
function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Optimizes image files before uploading to Google Apps Script.
 * Apps Script has tight execution timeouts and payload size limits (~10-25MB proxy cap).
 * Smartphone photos are often 8-15MB raw. Downscaling to 2048px (high-res clinical standard)
 * reduces the payload to ~300KB-800KB without any noticeable loss of follicle detail.
 */
function prepareUploadFile(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      asBase64(file).then(base64 => resolve({ base64, mimeType: file.type || 'application/octet-stream' })).catch(reject);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 2048;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        asBase64(file).then(base64 => resolve({ base64, mimeType: file.type })).catch(reject);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outMime = file.type === 'image/png' && file.size < 1_500_000 ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(outMime, 0.88);
      resolve({
        base64: dataUrl.split(',')[1],
        mimeType: outMime,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      asBase64(file).then(base64 => resolve({ base64, mimeType: file.type })).catch(reject);
    };
    img.src = objectUrl;
  });
}

function previewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/* ─── Slot Definitions ─── */
const PHOTO_SLOTS = [
  { key: 'Front', label: 'Front', icon: '🧑' },
  { key: 'Top / Crown', label: 'Top / Crown', icon: '⬆️' },
  { key: 'Left', label: 'Left', icon: '◀️' },
  { key: 'Right', label: 'Right', icon: '▶️' },
  { key: 'Back / Donor', label: 'Back / Donor', icon: '🔙' },
  { key: 'Other', label: 'Other', icon: '📷' },
];

const DOCUMENT_SLOTS = [
  { key: 'Consultation / OPD Card', label: 'Consultation', icon: '🩺' },
  { key: 'Blood Test', label: 'Blood Test', icon: '🩸' },
  { key: 'Biopsy', label: 'Biopsy', icon: '🔬' },
  { key: 'Consent Form', label: 'Consent Form', icon: '📝' },
  { key: 'Prescription', label: 'Prescription', icon: '💊' },
  { key: 'Other', label: 'Other Doc', icon: '📄' },
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

  // Navigation tab (photos: matrix / upload / register; documents: dossier / upload / register)
  const [viewTab, setViewTab] = useState<'upload' | 'matrix' | 'dossier' | 'register'>(photo ? 'upload' : 'dossier');

  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [, setSessions] = useState<Record<string, string>[]>([]);
  const [patientId, setPatientId] = useState('');
  const [sessionType, setSessionType] = useState('Before Transplant');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10));
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

  // Preview & Edit Modals state
  const [previewTarget, setPreviewTarget] = useState<PhotoRecord | DocumentRecord | null>(null);
  const [editTarget, setEditTarget] = useState<PhotoRecord | DocumentRecord | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const s = sessionStore.get();
  // Stabilise the token so useCallback / useEffect don't loop.
  // sessionStore.get() returns a *new* object every render → the old `s`
  // dependency kept re-creating `load` → re-triggering useEffect → infinite API calls.
  const tokenRef = useRef(s?.token ?? '');
  tokenRef.current = s?.token ?? '';

  const load = useCallback(() => {
    const token = tokenRef.current;
    if (!token) return;

    setError('');                       // <-- clear stale errors

    api<{ items: Record<string, string>[]; sessions?: Record<string, string>[] }>(photo ? 'photos.list' : 'documents.list', {}, token)
      .then(r => { setItems(r.items); setSessions(r.sessions || []); })
      .catch(e => setError(e.message));

    api<{ items: Patient[] }>('patients.list', { limit: 1000 }, token)
      .then(res => setPatients(res.items || []))
      .catch(() => {});
  }, [photo]);                          // <-- only depends on `photo`, not `s`

  useEffect(() => {
    load();
    if (typeof window !== 'undefined') {
      const pId = new URLSearchParams(window.location.search).get('patientId');
      if (pId) {
        setPatientId(pId);
        if (photo) setViewTab('matrix');
        else setViewTab('dossier');
      }
    }
  }, [load, photo]);

  const patientMap = useMemo(() => {
    const map: Record<string, Patient> = {};
    patients.forEach(p => {
      if (!p) return;
      if (p.id) {
        const idStr = String(p.id).trim();
        map[idStr] = p;
        map[idStr.toLowerCase()] = p;
      }
      if ((p as any).PatientID) {
        const pIdStr = String((p as any).PatientID).trim();
        map[pIdStr] = p;
        map[pIdStr.toLowerCase()] = p;
      }
    });
    return map;
  }, [patients]);

  const filledCount = useMemo(() => {
    return Object.values(slotFiles).filter(Boolean).length;
  }, [slotFiles]);

  const setFileForSlot = (key: string, file: File) => {
    setSlotFiles(prev => {
      if (prev[key]?.preview) URL.revokeObjectURL(prev[key]!.preview!);
      return {
        ...prev,
        [key]: {
          file,
          preview: file.type.startsWith('image/') ? previewUrl(file) : undefined,
        },
      };
    });
    setSlotStatus(prev => ({ ...prev, [key]: 'idle' }));
  };

  const removeFileFromSlot = (key: string) => {
    setSlotFiles(prev => {
      if (prev[key]?.preview) URL.revokeObjectURL(prev[key]!.preview!);
      return { ...prev, [key]: null };
    });
    setSlotStatus(prev => ({ ...prev, [key]: 'idle' }));
  };

  const resetAll = () => {
    Object.values(slotFiles).forEach(sf => {
      if (sf?.preview) URL.revokeObjectURL(sf.preview);
    });
    const initFiles: Record<string, SlotFile | null> = {};
    const initStatus: Record<string, SlotStatus> = {};
    slots.forEach(slot => {
      initFiles[slot.key] = null;
      initStatus[slot.key] = 'idle';
    });
    setSlotFiles(initFiles);
    setSlotStatus(initStatus);
    setNotes('');
  };

  async function uploadAll() {
    if (!patientId) {
      setError('Please select a registered patient before uploading.');
      return;
    }

    const entries = Object.entries(slotFiles).filter(([, sf]) => sf !== null) as [string, SlotFile][];
    if (entries.length === 0) {
      setError('Please choose or drag at least one file into a slot.');
      return;
    }

    const token = tokenRef.current;
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }

    setUploading(true);
    setError('');
    setFeedback('');
    setUploadProgress({ current: 0, total: entries.length });

    let successCount = 0;
    let failCount = 0;

    for (const [key, slotFile] of entries) {
      setSlotStatus(prev => ({ ...prev, [key]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));

      try {
        const prepared = await prepareUploadFile(slotFile.file);
        if (photo) {
          await api('photos.upload', {
            patientId,
            base64: prepared.base64,
            mimeType: prepared.mimeType,
            fileName: slotFile.file.name,
            extension: prepared.mimeType === 'image/png' ? 'png' : 'jpg',
            sessionType,
            photoDate,
            category: key,
            notes,
          }, token);
        } else {
          await api('documents.upload', {
            patientId,
            base64: prepared.base64,
            mimeType: prepared.mimeType,
            fileName: slotFile.file.name,
            documentType: key,
            notes,
          }, token);
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
      setFeedback(`✅ All ${successCount} file(s) uploaded successfully!`);
      setTimeout(() => {
        resetAll();
        load();
        if (photo) setViewTab('matrix');
        else setViewTab('dossier');
      }, 1200);
    } else {
      setError(`${failCount} file(s) failed to upload. ${successCount} succeeded. Please retry the failed ones.`);
      load();
    }
  }

  async function doDelete() {
    const token = tokenRef.current;
    if (!deleteTarget || !token) return;
    setDeleteBusy(true);
    try {
      await api(photo ? 'photos.delete' : 'documents.delete', photo ? { photoId: deleteTarget.id } : { documentId: deleteTarget.id }, token);
      setDeleteTarget(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); setDeleteTarget(null); }
    finally { setDeleteBusy(false); }
  }

  return (
    <AppShell title={photo ? 'Photos' : 'Documents'}>
      <div className="page-title">
        <div>
          <h2>{photo ? 'Hair Transplant Photo Documentation' : 'Patient Documents'}</h2>
          <p className="subtle">Files are securely archived and tracked across clinical milestones.</p>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#e7f7ef', color: 'var(--success)', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          {feedback}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      {/* Workspace View Switcher Tabs */}
      <div className="view-tabs">
        {photo ? (
          <>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewTab('matrix')}
            >
              📊 Timeline Comparison Matrix
            </button>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'upload' ? 'active' : ''}`}
              onClick={() => setViewTab('upload')}
            >
              📸 Multi-Slot Upload
            </button>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'register' ? 'active' : ''}`}
              onClick={() => setViewTab('register')}
            >
              📋 Photo Register ({items.length})
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'dossier' ? 'active' : ''}`}
              onClick={() => setViewTab('dossier')}
            >
              📁 Patient Document Dossier
            </button>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'upload' ? 'active' : ''}`}
              onClick={() => setViewTab('upload')}
            >
              📄 Multi-Slot Upload
            </button>
            <button
              type="button"
              className={`view-tab-btn ${viewTab === 'register' ? 'active' : ''}`}
              onClick={() => setViewTab('register')}
            >
              📋 Document Register ({items.length})
            </button>
          </>
        )}
      </div>

      {/* VIEW: Timeline Comparison Matrix (Photos Only) */}
      {photo && viewTab === 'matrix' && (
        <TimelineMatrix
          photos={items as unknown as PhotoRecord[]}
          patients={patients}
          selectedPatientId={patientId}
          onSelectPatient={(id) => setPatientId(id)}
          token={tokenRef.current}
          onPreview={(ph) => setPreviewTarget(ph)}
          onEdit={(ph) => setEditTarget(ph)}
          onUploadForSlot={(stage) => {
            setSessionType(stage);
            setViewTab('upload');
          }}
        />
      )}

      {/* VIEW: Patient Document Dossier (Documents Only) */}
      {!photo && viewTab === 'dossier' && (
        <DocumentDossier
          documents={items as unknown as DocumentRecord[]}
          patients={patients}
          selectedPatientId={patientId}
          onSelectPatient={(id) => setPatientId(id)}
          token={tokenRef.current}
          onPreview={(doc) => setPreviewTarget(doc)}
          onEdit={(doc) => setEditTarget(doc)}
          onDelete={(doc) => setDeleteTarget({ id: doc.DocumentID, label: doc.FileName })}
          onUploadForCategory={() => {
            setViewTab('upload');
          }}
        />
      )}

      {/* VIEW: Upload Section */}
      {viewTab === 'upload' && (
        <section className="panel">
          <h3>{photo ? '📸 Upload patient photos (6 Angles)' : '📄 Upload patient documents'}</h3>
          <p className="subtle" style={{ marginTop: '-8px', marginBottom: '16px' }}>
            {photo
              ? 'Select a patient and the timeline stage, set the capture date, then drop or browse photos into the angle slots.'
              : 'Select a patient, then add documents for each category. You can drag-and-drop or click each square to browse.'}
          </p>

          {/* Patient, Stage & Date Selection */}
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
              <>
                <label className="field" style={{ marginTop: '8px' }}>
                  Timeline Stage / Milestone
                  <select value={sessionType} onChange={e => setSessionType(e.target.value)}>
                    {[
                      'Before Transplant',
                      'Day of Transplant',
                      'After Transplant',
                      'Follow-up 1 (1 Month)',
                      'Follow-up 2 (3 Months)',
                      'Follow-up 3 (6 Months)',
                      'Follow-up 4 (1 Year)',
                      'Follow-up',
                      'Review',
                      'Routine Visit',
                      'Other'
                    ].map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>

                <label className="field" style={{ marginTop: '8px' }}>
                  Date Clicked / Taken
                  <input
                    type="date"
                    value={photoDate}
                    onChange={e => setPhotoDate(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
          </div>

          {/* Upload Slots Grid (Single row, 6 slots) */}
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
            Clinical Notes (optional — applies to all uploads in this batch)
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, follicle condition, graft retention..." />
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
      )}

      {/* Files Register Table */}
      {(!photo || viewTab === 'register' || viewTab === 'upload') && (
        <section className="panel" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0 }}>{photo ? '📸 Photo Register' : '📄 Document Register'}</h3>
            <span className="badge-muted">{items.length} total file(s)</span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>{photo ? 'Timeline & Angle' : 'Category'}</th>
                  {photo && <th>Date Clicked</th>}
                  <th>File / Preview</th>
                  <th>Uploaded At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? items.map(x => {
                  const pid = String(x.PatientID || '').trim();
                  const p = patientMap[pid] || patientMap[pid.toLowerCase()];
                  const patientName = p?.fullName || pid;
                  return (
                    <tr key={x.PhotoID || x.DocumentID}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '13.5px' }}>
                          👤 {patientName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                          ID: {x.PatientID}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {x.SessionType && (
                            <span className="badge" style={{ fontSize: '10.5px', alignSelf: 'flex-start' }}>
                              {x.SessionType}
                            </span>
                          )}
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {x.Category || x.DocumentType}
                          </span>
                        </div>
                      </td>
                      {photo && (
                        <td>
                          <strong style={{ color: 'var(--ink)' }}>
                            {x.PhotoDate || (x.CreatedAt ? String(x.CreatedAt).slice(0, 10) : '—')}
                          </strong>
                        </td>
                      )}
                      <td>
                        <span
                          style={{ cursor: 'pointer', color: 'var(--primary-dark)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => setPreviewTarget(x as unknown as (PhotoRecord | DocumentRecord))}
                          title="Click to preview"
                        >
                          <span>{photo ? '📸' : '📄'}</span>
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {x.FileName}
                          </span>
                        </span>
                      </td>
                      <td>{x.CreatedAt ? String(x.CreatedAt).slice(0, 16) : '—'}</td>
                      <td className="row-actions">
                        <button
                          className="btn-icon"
                          title="Preview file"
                          onClick={() => setPreviewTarget(x as unknown as (PhotoRecord | DocumentRecord))}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit metadata"
                          onClick={() => setEditTarget(x as unknown as (PhotoRecord | DocumentRecord))}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete"
                          onClick={() => setDeleteTarget({ id: x.PhotoID || x.DocumentID, label: x.FileName })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={photo ? 6 : 5} className="empty">No files yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* High-Resolution Lightbox Preview Modal */}
      <FilePreviewModal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        item={previewTarget}
        type={photo ? 'photo' : 'document'}
        token={s?.token}
        patientName={previewTarget ? patientMap[previewTarget.PatientID]?.fullName : undefined}
        onEditRequest={(item) => setEditTarget(item)}
      />

      {/* Edit Metadata Modal */}
      <FileEditModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        item={editTarget}
        type={photo ? 'photo' : 'document'}
        token={s?.token}
        onSaved={load}
      />

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
