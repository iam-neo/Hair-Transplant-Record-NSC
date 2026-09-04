"use client";
import { type ChangeEvent, type FormEvent, useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PatientSelect } from "@/components/ui/PatientSelect";
import type { Patient } from "@/types";

function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function FilesWorkspace({ kind }: { kind: 'photos' | 'documents' }) {
  const photo = kind === 'photos';
  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [, setSessions] = useState<Record<string, string>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ sessionType: 'Other', category: 'Front' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      if (pId) {
        setForm(prev => ({ ...prev, patientId: pId }));
      }
    }
  }, []);

  const patientMap = useMemo(() => {
    const map: Record<string, Patient> = {};
    patients.forEach(p => { map[p.id] = p; });
    return map;
  }, [patients]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!s || !file) return;
    if (!form.patientId) {
      setError('Please select a registered patient before uploading.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = { ...form, base64: await asBase64(file), mimeType: file.type, fileName: file.name, extension: file.name.split('.').pop() };
      await api(photo ? 'photos.upload' : 'documents.upload', payload, s.token);
      setFile(null);
      setForm(prev => ({ ...prev, notes: '' }));
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setSaving(false); }
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
      {error && <div className="form-error">{error}</div>}

      {/* Upload Form */}
      <section className="panel">
        <h3>{photo ? 'Upload patient photo' : 'Upload patient document'}</h3>
        <form onSubmit={submit}>
          <div className="grid2">
            <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
              <PatientSelect
                value={form.patientId || ''}
                onChange={(id) => setForm({ ...form, patientId: id })}
                required
                initialPatients={patients}
                label="Select Registered Patient"
                placeholder="Type patient name, phone number, or ID to attach file to..."
              />
            </div>
            {photo ? (
              <>
                <label className="field">Session type
                  <select value={form.sessionType || ''} onChange={e => setForm({ ...form, sessionType: e.target.value })}>
                    {['Before Transplant', 'Day of Transplant', 'After Transplant', 'Follow-up', 'Review', 'Routine Visit', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="field">Category
                  <select value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['Front', 'Top', 'Left', 'Right', 'Back / Donor', 'Other'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <label className="field">Document type
                <input
                  placeholder="e.g. Consent form, Blood test, Biopsy, Referral"
                  value={form.documentType || ''}
                  onChange={e => setForm({ ...form, documentType: e.target.value })}
                />
              </label>
            )}
            <label className="field">File
              <input
                required
                type="file"
                accept={photo ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/*'}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <label className="field">Notes
            <textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            <button className="button" disabled={!file || !form.patientId || saving}>
              {saving ? 'Uploading to Drive…' : `Upload ${photo ? 'photo' : 'document'} securely`}
            </button>
          </div>
        </form>
      </section>

      {/* Photo Sessions Table (photos only) */}
      {photo && (
        <section className="panel">
          <h3>Photo sessions</h3>
          <p className="subtle">Uploaded photos retain the selected clinical session type and anatomical angle.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Patient</th><th>Session</th><th>Category</th><th>File</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length ? items.map(x => (
                  <tr key={x.PhotoID}>
                    <td>{x.CreatedAt}</td>
                    <td>
                      <strong style={{ color: 'var(--navy)' }}>{x.PatientID}</strong>
                      {patientMap[x.PatientID] && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                          {patientMap[x.PatientID].fullName}
                        </div>
                      )}
                    </td>
                    <td>{x.PhotoSessionID || x.SessionType || '—'}</td>
                    <td>{x.Category}</td>
                    <td>{x.FileName}</td>
                    <td className="row-actions">
                      <button className="btn-icon" title="Delete photo" onClick={() => setDeleteTarget({ id: x.PhotoID, label: x.FileName })}>🗑️</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6} className="empty">No photos yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Files Register */}
      <section className="panel">
        <h3>{photo ? 'Photo' : 'Document'} register</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Patient</th><th>File</th><th>Type</th><th>Created</th><th>Actions</th></tr></thead>
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
