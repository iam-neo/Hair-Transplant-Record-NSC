"use client";
import { type FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

type Field = { name: string; label: string; type?: string; options?: string[] };
type Config = { title: string; action: string; fields: Field[]; columns: string[]; idColumn: string };

const configs: Record<string, Config> = {
  consultations: { title: 'Consultations', action: 'consultations', idColumn: 'ConsultationID', fields: [{ name: 'patientId', label: 'Patient ID' }, { name: 'consultationDate', label: 'Consultation date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'mainConcern', label: 'Main concern' }, { name: 'consultationNotes', label: 'Clinical notes', type: 'textarea' }, { name: 'recommendation', label: 'Recommendation', type: 'textarea' }], columns: ['ConsultationID', 'PatientID', 'ConsultationDate', 'Doctor', 'MainConcern'] },
  assessments: { title: 'Assessments', action: 'assessments', idColumn: 'AssessmentID', fields: [{ name: 'patientId', label: 'Patient ID' }, { name: 'assessmentDate', label: 'Assessment date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'hairLossPattern', label: 'Hair-loss pattern' }, { name: 'norwoodClassification', label: 'Norwood classification' }, { name: 'frontalGrafts', label: 'Frontal estimated grafts', type: 'number' }, { name: 'midScalpGrafts', label: 'Mid-scalp estimated grafts', type: 'number' }, { name: 'crownGrafts', label: 'Crown estimated grafts', type: 'number' }, { name: 'clinicalNotes', label: 'Clinical notes', type: 'textarea' }], columns: ['AssessmentID', 'PatientID', 'AssessmentDate', 'Doctor', 'NorwoodClassification', 'EstimatedGrafts'] },
  procedures: { title: 'Procedures', action: 'procedures', idColumn: 'ProcedureID', fields: [{ name: 'patientId', label: 'Patient ID' }, { name: 'procedureDate', label: 'Procedure date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'procedureType', label: 'Procedure type' }, { name: 'plannedGrafts', label: 'Planned grafts', type: 'number' }, { name: 'harvestedGrafts', label: 'Harvested grafts', type: 'number' }, { name: 'implantedGrafts', label: 'Implanted grafts', type: 'number' }, { name: 'procedureStatus', label: 'Status', options: ['Planned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'] }, { name: 'procedureNotes', label: 'Procedure notes', type: 'textarea' }], columns: ['ProcedureID', 'PatientID', 'ProcedureDate', 'Doctor', 'ProcedureStatus', 'ImplantedGrafts'] },
  followups: { title: 'Follow-ups', action: 'followups', idColumn: 'FollowUpID', fields: [{ name: 'patientId', label: 'Patient ID' }, { name: 'followUpDate', label: 'Follow-up date', type: 'date' }, { name: 'followUpType', label: 'Type', options: ['Day 1', 'Week 1', 'Month 1', 'Month 3', 'Month 6', 'Year 1', 'Other'] }, { name: 'assignedTo', label: 'Assigned to' }, { name: 'notes', label: 'Notes', type: 'textarea' }], columns: ['FollowUpID', 'PatientID', 'FollowUpDate', 'FollowUpType', 'Status', 'AssignedTo'] },
  payments: { title: 'Payments', action: 'payments', idColumn: 'PaymentID', fields: [{ name: 'patientId', label: 'Patient ID' }, { name: 'paymentDate', label: 'Payment date', type: 'date' }, { name: 'amount', label: 'Amount (NPR)', type: 'number' }, { name: 'method', label: 'Method', options: ['Cash', 'Card', 'Bank transfer', 'Mobile payment', 'Other'] }, { name: 'reference', label: 'Reference' }, { name: 'notes', label: 'Notes', type: 'textarea' }], columns: ['PaymentID', 'PatientID', 'PaymentDate', 'Amount', 'Method', 'Reference'] }
};

export function RecordWorkspace({ module }: { module: string }) {
  const config = configs[module];
  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const session = sessionStore.get();

  const load = () => {
    if (session && config) api<{ items: Record<string, string>[] }>(config.action + '.list', {}, session.token).then(x => setItems(x.items)).catch(e => setError(e.message));
  };

  useEffect(load, []);

  if (!config) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true); setError('');
    try {
      await api(config.action + '.create', form, session.token);
      setOpen(false); setForm({}); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the record.'); }
    finally { setBusy(false); }
  }

  function startEdit(row: Record<string, string>) {
    const id = row[config.idColumn];
    setEditId(id);
    // Map columns back to field names for editing
    const formData: Record<string, string> = {};
    config.fields.forEach(f => {
      const colName = f.name.charAt(0).toUpperCase() + f.name.slice(1);
      formData[f.name] = row[colName] || '';
    });
    setEditForm(formData);
    setEditOpen(true); setError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true); setError('');
    try {
      await api(config.action + '.update', { id: editId, ...editForm }, session.token);
      setEditOpen(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the record.'); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    if (!deleteTarget || !session) return;
    setDeleteBusy(true);
    try {
      await api(config.action + '.delete', { id: deleteTarget.id }, session.token);
      setDeleteTarget(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the record.'); setDeleteTarget(null); }
    finally { setDeleteBusy(false); }
  }

  return (
    <AppShell title={config.title}>
      <div className="page-title">
        <div>
          <h2>{config.title}</h2>
          <p className="subtle">Records are stored through the authorized clinic backend.</p>
        </div>
        <button className="button" onClick={() => setOpen(true)}>Add record</button>
      </div>
      {error && <div className="form-error">{error}</div>}
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {config.columns.map(c => <th key={c}>{c.replace(/([A-Z])/g, ' $1')}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((r, i) => (
                <tr key={r[config.columns[0]] || i}>
                  {config.columns.map(c => <td key={c}>{r[c] || '—'}</td>)}
                  <td className="row-actions">
                    <button className="btn-icon" title="Edit" onClick={() => startEdit(r)}>✏️</button>
                    <button className="btn-icon" title="Delete" onClick={() => setDeleteTarget({ id: r[config.idColumn], label: r[config.idColumn] })}>🗑️</button>
                  </td>
                </tr>
              )) : <tr><td className="empty" colSpan={config.columns.length + 1}>No records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Record Modal */}
      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <h2>Add {config.title.slice(0, -1)}</h2>
            <div className="grid2">
              {config.fields.map(f => (
                <label className="field" key={f.name}>
                  {f.label}
                  {f.type === 'textarea' ? <textarea rows={3} value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
                    : f.options ? <select required value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })}><option value="">Select</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
                      : <input required={f.name === 'patientId' || f.name.includes('Date') || f.name === 'amount'} type={f.type || 'text'} value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />}
                </label>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Record Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${config.title.slice(0, -1)}`} subtitle={`Editing record ${editId}`}>
        <form onSubmit={saveEdit}>
          <div className="grid2">
            {config.fields.filter(f => f.name !== 'patientId').map(f => (
              <label className="field" key={f.name}>
                {f.label}
                {f.type === 'textarea' ? <textarea rows={3} value={editForm[f.name] || ''} onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })} />
                  : f.options ? <select value={editForm[f.name] || ''} onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })}><option value="">Select</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
                    : <input type={f.type || 'text'} value={editForm[f.name] || ''} onChange={e => setEditForm({ ...editForm, [f.name]: e.target.value })} />}
              </label>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete ${config.title.slice(0, -1)}`}
        message={`Are you sure you want to permanently delete record "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmLabel="Delete permanently"
        danger
        busy={deleteBusy}
      />
    </AppShell>
  );
}
