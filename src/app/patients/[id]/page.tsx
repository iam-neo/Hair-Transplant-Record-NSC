"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore, can } from "@/lib/auth/session";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

type ActivityRow = Record<string, string>;
type PatientData = Record<string, string>;
type Result = { patient: PatientData; activity: ActivityRow[] };

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'restore' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const loadPatient = () => {
    const s = sessionStore.get();
    if (s) api<Result>('patients.get', { patientId: id }, s.token).then(setData).catch(e => setError(e.message));
  };

  useEffect(() => { loadPatient(); }, [id]);

  const session = typeof window !== 'undefined' ? sessionStore.get() : null;

  function openEdit() {
    if (!data) return;
    setEditForm({
      fullName: data.patient.FullName || '',
      dateOfBirth: data.patient.DateOfBirth || '',
      gender: data.patient.Gender || '',
      contactNumber: data.patient.ContactNumber || '',
      email: data.patient.Email || '',
      address: data.patient.Address || '',
      notes: data.patient.Notes || '',
    });
    setEditOpen(true); setError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    const s = sessionStore.get();
    if (!s) return;
    setSaving(true); setError('');
    try {
      await api('patients.update', { patientId: id, ...editForm }, s.token);
      setEditOpen(false); loadPatient();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update patient.'); }
    finally { setSaving(false); }
  }

  async function doConfirmAction() {
    if (!confirmAction) return;
    const s = sessionStore.get();
    if (!s) return;
    setConfirmBusy(true);
    try {
      await api(confirmAction === 'archive' ? 'patients.archive' : 'patients.restore', { patientId: id }, s.token);
      setConfirmAction(null); loadPatient();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); setConfirmAction(null); }
    finally { setConfirmBusy(false); }
  }

  const isArchived = data?.patient.Status === 'Archived';

  return (
    <AppShell title="Patient profile">
      <div className="page-title">
        <div>
          <div className="eyebrow">{data?.patient.PatientID || id}</div>
          <h2>{data?.patient.FullName || 'Loading patient…'}</h2>
          <p className="subtle">{data?.patient.ContactNumber || '—'} · {data?.patient.Email || 'No email'} · <span className={`badge ${isArchived ? 'badge-muted' : ''}`}>{data?.patient.Status || '—'}</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {can(session?.user ?? null, 'patients.edit') && <button className="button secondary" onClick={openEdit}>Edit details</button>}
          {!isArchived && can(session?.user ?? null, 'patients.archive') && <button className="button danger" onClick={() => setConfirmAction('archive')}>Archive</button>}
          {isArchived && can(session?.user ?? null, 'patients.edit') && <button className="button" onClick={() => setConfirmAction('restore')}>Restore</button>}
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}

      {/* Quick Record Actions Toolbar */}
      <section className="panel" style={{ marginTop: 0, marginBottom: '20px', background: '#f8fafc', border: '1px solid var(--border)', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--navy)' }}>⚡ Quick Record Actions</h3>
            <p className="subtle" style={{ margin: '2px 0 0', fontSize: '12px' }}>
              Add records or files directly for {data?.patient.FullName || id}:
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link href={`/consultations?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Consultation
            </Link>
            <Link href={`/assessments?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Assessment
            </Link>
            <Link href={`/procedures?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Procedure
            </Link>
            <Link href={`/followups?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Follow-up
            </Link>
            <Link href={`/payments?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Payment
            </Link>
            <Link href={`/photos?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              📸 Photo
            </Link>
            <Link href={`/documents?patientId=${id}`} className="button secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              📄 Document
            </Link>
          </div>
        </div>
      </section>

      {/* Patient Details Panel */}
      {data && (
        <section className="panel">
          <h3>Patient details</h3>
          <div className="grid2" style={{ gap: '12px 32px' }}>
            <div><strong>Full Name</strong><p>{data.patient.FullName}</p></div>
            <div><strong>Date of Birth</strong><p>{data.patient.DateOfBirth || '—'}</p></div>
            <div><strong>Gender</strong><p>{data.patient.Gender || '—'}</p></div>
            <div><strong>Contact</strong><p>{data.patient.ContactNumber}</p></div>
            <div><strong>Email</strong><p>{data.patient.Email || '—'}</p></div>
            <div><strong>Address</strong><p>{data.patient.Address || '—'}</p></div>
            <div><strong>Registered</strong><p>{data.patient.RegistrationDate}</p></div>
            <div><strong>Notes</strong><p>{data.patient.Notes || '—'}</p></div>
          </div>
        </section>
      )}

      {/* Activity Timeline */}
      <section className="panel">
        <h3>Patient activity timeline</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date/time</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
            <tbody>
              {data?.activity.length ? data.activity.map(x => (
                <tr key={x.ActivityID}><td>{x.CreatedAt}</td><td>{x.Action}</td><td>{x.Entity}</td><td>{x.Description}</td></tr>
              )) : <tr><td colSpan={4} className="empty">No activity recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Patient Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit patient" subtitle={`Update details for ${id}`}>
        <form onSubmit={saveEdit}>
          <div className="grid2">
            <label className="field">Full name<input required value={editForm.fullName || ''} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} /></label>
            <label className="field">Date of birth<input type="date" value={editForm.dateOfBirth || ''} onChange={e => setEditForm({ ...editForm, dateOfBirth: e.target.value })} /></label>
            <label className="field">Gender<select value={editForm.gender || ''} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></label>
            <label className="field">Contact number<input required value={editForm.contactNumber || ''} onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })} /></label>
            <label className="field">Email<input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>
            <label className="field">Address<input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></label>
          </div>
          <label className="field">Notes<textarea rows={3} value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></label>
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Archive/Restore */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={doConfirmAction}
        title={confirmAction === 'archive' ? 'Archive patient' : 'Restore patient'}
        message={confirmAction === 'archive' ? 'This patient will be moved to Archived status. Clinical records are preserved.' : 'This patient will be restored to Active status.'}
        confirmLabel={confirmAction === 'archive' ? 'Archive' : 'Restore'}
        danger={confirmAction === 'archive'}
        busy={confirmBusy}
      />
    </AppShell>
  );
}
