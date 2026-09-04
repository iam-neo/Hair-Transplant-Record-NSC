"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore, can, type StoredSession } from "@/lib/auth/session";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import type { Patient } from "@/types";

const initial = { fullName: '', dateOfBirth: '', gender: '', contactNumber: '', email: '', address: '', notes: '' };

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState('');

  // Archive/Delete confirm state
  const [confirmAction, setConfirmAction] = useState<{ type: 'archive' | 'restore' | 'delete'; id: string; name: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = () => {
    const s = sessionStore.get();
    if (s) api<{ items: Patient[] }>('patients.list', { query, status: statusFilter }, s.token)
      .then(r => setPatients(r.items))
      .catch(e => setError(e.message));
  };

  useEffect(() => { setSession(sessionStore.get()); load(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const s = sessionStore.get();
    if (!s) return;
    setSaving(true); setError('');
    try {
      const check = await api<{ possibleDuplicates: Patient[] }>('patients.duplicates', { fullName: form.fullName, contactNumber: form.contactNumber, email: form.email, dateOfBirth: form.dateOfBirth }, s.token);
      if (check.possibleDuplicates.length && !confirm('A possible duplicate was found. Create this patient anyway?')) return;
      await api('patients.create', form, s.token);
      setOpen(false); setForm(initial); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save patient.'); }
    finally { setSaving(false); }
  }

  function startEdit(p: Patient) {
    setEditId(p.id);
    setEditForm({ fullName: p.fullName, dateOfBirth: p.dateOfBirth || '', gender: p.gender || '', contactNumber: p.contactNumber, email: p.email || '', address: p.address || '', notes: p.notes || '' });
    setEditOpen(true); setError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    const s = sessionStore.get();
    if (!s) return;
    setSaving(true); setError('');
    try {
      await api('patients.update', { patientId: editId, ...editForm }, s.token);
      setEditOpen(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update patient.'); }
    finally { setSaving(false); }
  }

  async function doConfirmAction() {
    if (!confirmAction) return;
    const s = sessionStore.get();
    if (!s) return;
    setConfirmBusy(true);
    try {
      const actionMap = { archive: 'patients.archive', restore: 'patients.restore', delete: 'patients.delete' };
      await api(actionMap[confirmAction.type], { patientId: confirmAction.id }, s.token);
      setConfirmAction(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); setConfirmAction(null); }
    finally { setConfirmBusy(false); }
  }

  return (
    <AppShell title="Patients">
      <div className="page-title">
        <div>
          <h2>Patients</h2>
          <p className="subtle">Search and maintain secure patient records.</p>
        </div>
        {can(session?.user ?? null, 'patients.create') && <button className="button" onClick={() => setOpen(true)}>Register patient</button>}
      </div>
      {error && <div className="form-error">{error}</div>}

      <section className="panel">
        <div className="toolbar">
          <input placeholder="Search name, ID, phone or email" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
            <option value="Completed">Completed</option>
          </select>
          <button className="button secondary" onClick={load}>Search</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Patient ID</th><th>Name</th><th>Contact</th><th>Registered</th><th>Status</th><th>Last activity</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length ? patients.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><Link href={`/patients/${p.id}`}>{p.fullName}</Link></td>
                  <td>{p.contactNumber}</td>
                  <td>{p.registrationDate}</td>
                  <td><span className={`badge ${p.status === 'Archived' ? 'badge-muted' : ''}`}>{p.status}</span></td>
                  <td>{p.lastActivity || '—'}</td>
                  <td className="row-actions">
                    {can(session?.user ?? null, 'patients.edit') && <button className="btn-icon" title="Edit" onClick={() => startEdit(p)}>✏️</button>}
                    {p.status === 'Active' && can(session?.user ?? null, 'patients.archive') && <button className="btn-icon" title="Archive" onClick={() => setConfirmAction({ type: 'archive', id: p.id, name: p.fullName })}>📦</button>}
                    {p.status === 'Archived' && can(session?.user ?? null, 'patients.edit') && <button className="btn-icon" title="Restore" onClick={() => setConfirmAction({ type: 'restore', id: p.id, name: p.fullName })}>♻️</button>}
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="empty">No patients found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Register Patient Modal */}
      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <h2>Register patient</h2>
            <p className="subtle">A server-generated patient ID will be assigned after validation.</p>
            <div className="grid2">
              <label className="field">Full name<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
              <label className="field">Date of birth<input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
              <label className="field">Gender<select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label className="field">Contact number<input required value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} /></label>
              <label className="field">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
              <label className="field">Address<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <label className="field">Additional notes<textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="actions">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="button" disabled={saving}>{saving ? 'Saving…' : 'Create patient'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Patient Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit patient" subtitle={`Update details for ${editId}`}>
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

      {/* Confirm Archive/Restore/Delete */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={doConfirmAction}
        title={confirmAction?.type === 'archive' ? 'Archive patient' : confirmAction?.type === 'restore' ? 'Restore patient' : 'Delete patient'}
        message={`Are you sure you want to ${confirmAction?.type} "${confirmAction?.name}"? ${confirmAction?.type === 'delete' ? 'This action is permanent and cannot be undone.' : ''}`}
        confirmLabel={confirmAction?.type === 'archive' ? 'Archive' : confirmAction?.type === 'restore' ? 'Restore' : 'Permanently delete'}
        danger={confirmAction?.type === 'delete'}
        busy={confirmBusy}
      />
    </AppShell>
  );
}
