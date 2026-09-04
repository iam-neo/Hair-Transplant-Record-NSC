"use client";
import { type FormEvent, useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { PatientSelect } from "@/components/ui/PatientSelect";
import type { Patient } from "@/types";

type Field = { name: string; label: string; type?: string; options?: string[] };
type Config = { title: string; action: string; fields: Field[]; columns: string[]; idColumn: string };

interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

const configs: Record<string, Config> = {
  consultations: { title: 'Consultations', action: 'consultations', idColumn: 'ConsultationID', fields: [{ name: 'patientId', label: 'Patient' }, { name: 'consultationDate', label: 'Consultation date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'mainConcern', label: 'Main concern' }, { name: 'consultationNotes', label: 'Clinical notes', type: 'textarea' }, { name: 'recommendation', label: 'Recommendation', type: 'textarea' }], columns: ['PatientID', 'ConsultationDate', 'Doctor', 'MainConcern', 'ConsultationID'] },
  assessments: { title: 'Assessments', action: 'assessments', idColumn: 'AssessmentID', fields: [{ name: 'patientId', label: 'Patient' }, { name: 'assessmentDate', label: 'Assessment date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'hairLossPattern', label: 'Hair-loss pattern' }, { name: 'norwoodClassification', label: 'Norwood classification' }, { name: 'frontalGrafts', label: 'Frontal estimated grafts', type: 'number' }, { name: 'midScalpGrafts', label: 'Mid-scalp estimated grafts', type: 'number' }, { name: 'crownGrafts', label: 'Crown estimated grafts', type: 'number' }, { name: 'clinicalNotes', label: 'Clinical notes', type: 'textarea' }], columns: ['PatientID', 'AssessmentDate', 'Doctor', 'NorwoodClassification', 'EstimatedGrafts', 'AssessmentID'] },
  procedures: { title: 'Procedures', action: 'procedures', idColumn: 'ProcedureID', fields: [{ name: 'patientId', label: 'Patient' }, { name: 'procedureDate', label: 'Procedure date', type: 'date' }, { name: 'doctor', label: 'Doctor' }, { name: 'procedureType', label: 'Procedure type' }, { name: 'plannedGrafts', label: 'Planned grafts', type: 'number' }, { name: 'harvestedGrafts', label: 'Harvested grafts', type: 'number' }, { name: 'implantedGrafts', label: 'Implanted grafts', type: 'number' }, { name: 'procedureStatus', label: 'Status', options: ['Planned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'] }, { name: 'procedureNotes', label: 'Procedure notes', type: 'textarea' }], columns: ['PatientID', 'ProcedureDate', 'Doctor', 'ProcedureStatus', 'ImplantedGrafts', 'ProcedureID'] },
  followups: { title: 'Follow-ups', action: 'followups', idColumn: 'FollowUpID', fields: [{ name: 'patientId', label: 'Patient' }, { name: 'followUpDate', label: 'Follow-up date', type: 'date' }, { name: 'followUpTime', label: 'Follow-up time (optional)', type: 'time' }, { name: 'followUpType', label: 'Type', options: ['Day 1', 'Week 1', 'Month 1', 'Month 3', 'Month 6', 'Year 1', 'Other'] }, { name: 'assignedTo', label: 'Assigned to' }, { name: 'notes', label: 'Notes', type: 'textarea' }], columns: ['PatientID', 'FollowUpDate', 'FollowUpType', 'Status', 'AssignedTo', 'FollowUpID'] },
  payments: { title: 'Payments', action: 'payments', idColumn: 'PaymentID', fields: [{ name: 'patientId', label: 'Patient' }, { name: 'paymentDate', label: 'Payment date', type: 'date' }, { name: 'amount', label: 'Amount (NPR)', type: 'number' }, { name: 'method', label: 'Method', options: ['Cash', 'Card', 'Bank transfer', 'Mobile payment', 'Other'] }, { name: 'reference', label: 'Reference' }, { name: 'notes', label: 'Notes', type: 'textarea' }], columns: ['PatientID', 'PaymentDate', 'Amount', 'Method', 'Reference', 'PaymentID'] }
};

export function RecordWorkspace({ module }: { module: string }) {
  const config = configs[module];
  const [items, setItems] = useState<Record<string, string>[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Email notifications state (specifically for followups)
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [patientEmailOverride, setPatientEmailOverride] = useState('');
  const [selectedStaffEmails, setSelectedStaffEmails] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [sendEmailNow, setSendEmailNow] = useState(true);
  const [scheduleReminder, setScheduleReminder] = useState(true);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const session = sessionStore.get();

  const load = () => {
    const s = sessionStore.get();
    const token = s?.token;
    if (token && config) {
      api<{ items: Record<string, string>[] }>(config.action + '.list', {}, token)
        .then(x => setItems(x.items || []))
        .catch(e => setError(e.message));
      
      api<{ items: Patient[] }>('patients.list', { limit: 1000 }, token)
        .then(res => setPatients(res.items || []))
        .catch(() => {});

      if (module === 'followups') {
        api<{ items: StaffUser[] }>('users.list', {}, token)
          .then(res => {
            const activeStaff = (res.items || []).filter(u => u.status === 'Active' && u.email);
            setStaffList(activeStaff);
          })
          .catch(() => {});
      }
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== 'undefined') {
      const pId = new URLSearchParams(window.location.search).get('patientId');
      if (pId) {
        setForm(prev => ({ ...prev, patientId: pId }));
        setOpen(true);
      }
    }
  }, [module]);

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

  const addCustomEmail = () => {
    const email = customEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!customEmails.includes(email)) {
      setCustomEmails([...customEmails, email]);
    }
    setCustomEmailInput('');
    setError('');
  };

  if (!config) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!form.patientId) {
      setError('Please select a registered patient.');
      return;
    }
    setBusy(true); setError(''); setFeedback('');

    const payload: Record<string, unknown> = { ...form };

    // Attach email recipients for followups
    if (module === 'followups') {
      const recipientList: { email: string; name: string; type: 'patient' | 'staff' }[] = [];
      const seenEmails = new Set<string>();

      // 1. Patient email
      if (notifyPatient) {
        const patientEmail = (patientEmailOverride.trim() || patientMap[form.patientId]?.email || '').toLowerCase();
        if (patientEmail && /^\S+@\S+\.\S+$/.test(patientEmail) && !seenEmails.has(patientEmail)) {
          seenEmails.add(patientEmail);
          recipientList.push({
            email: patientEmail,
            name: patientMap[form.patientId]?.fullName || 'Patient',
            type: 'patient',
          });
        }
      }

      // 2. Selected clinic doctors & staff
      selectedStaffEmails.forEach(em => {
        const clean = em.trim().toLowerCase();
        if (clean && /^\S+@\S+\.\S+$/.test(clean) && !seenEmails.has(clean)) {
          seenEmails.add(clean);
          const staff = staffList.find(s => s.email.toLowerCase() === clean);
          recipientList.push({
            email: clean,
            name: staff?.fullName || 'Staff Member',
            type: 'staff',
          });
        }
      });

      // 3. Custom additional emails
      customEmails.forEach(em => {
        const clean = em.trim().toLowerCase();
        if (clean && /^\S+@\S+\.\S+$/.test(clean) && !seenEmails.has(clean)) {
          seenEmails.add(clean);
          recipientList.push({
            email: clean,
            name: 'Clinic Team',
            type: 'staff',
          });
        }
      });

      payload.recipients = recipientList;
      payload.sendEmailNow = sendEmailNow;
      payload.scheduleReminder = scheduleReminder;
    }

    try {
      const res = await api<{ id: string; recipientsCount?: number }>(config.action + '.create', payload, session.token);
      setOpen(false);
      setForm({});
      setCustomEmails([]);
      setPatientEmailOverride('');
      setSelectedStaffEmails([]);
      if (module === 'followups' && res?.recipientsCount !== undefined && res.recipientsCount > 0) {
        setFeedback(`Follow-up saved! Email notification sent to ${res.recipientsCount} recipient(s).`);
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the record.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: Record<string, string>) {
    const id = row[config.idColumn];
    setEditId(id);
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
        <button
          className="button"
          onClick={() => {
            setForm({});
            setSelectedStaffEmails([]);
            setCustomEmails([]);
            setFeedback('');
            setOpen(true);
          }}
        >
          Add record
        </button>
      </div>

      {feedback && (
        <div style={{ background: '#e7f7ef', color: 'var(--success)', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          ✓ {feedback}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {config.columns.map(c => (
                  <th key={c}>
                    {c === 'PatientID'
                      ? 'Patient Name'
                      : c === 'ConsultationID'
                      ? 'Consultation ID'
                      : c === 'AssessmentID'
                      ? 'Assessment ID'
                      : c === 'ProcedureID'
                      ? 'Procedure ID'
                      : c === 'FollowUpID'
                      ? 'Follow-up ID'
                      : c === 'PaymentID'
                      ? 'Payment ID'
                      : c === 'EstimatedGrafts'
                      ? 'Est. Grafts'
                      : c === 'ImplantedGrafts'
                      ? 'Imp. Grafts'
                      : c.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((r, i) => (
                <tr key={r[config.columns[0]] || i}>
                  {config.columns.map(c => {
                    if (c === 'PatientID') {
                      const pid = String(r[c] || '').trim();
                      const p = patientMap[pid] || patientMap[pid.toLowerCase()];
                      return (
                        <td key={c}>
                          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '13.5px' }}>
                            👤 {p?.fullName || pid || '—'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                            ID: {pid} {p?.contactNumber ? `• 📞 ${p.contactNumber}` : ''}
                          </div>
                        </td>
                      );
                    }
                    if (c === 'Amount') {
                      return (
                        <td key={c}>
                          <strong style={{ color: '#047857', fontSize: '13.5px' }}>
                            NPR {Number(r[c] || 0).toLocaleString()}
                          </strong>
                        </td>
                      );
                    }
                    if (c.endsWith('ID')) {
                      return (
                        <td key={c}>
                          <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {r[c] || '—'}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={c}>
                        {r[c] || '—'}
                      </td>
                    );
                  })}
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
          <form className="modal" onSubmit={submit} style={{ maxWidth: module === 'followups' ? '740px' : '640px' }}>
            <h2>Add {config.title.slice(0, -1)}</h2>
            <div className="grid2">
              {config.fields.map(f => {
                if (f.name === 'patientId') {
                  return (
                    <div key={f.name} style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
                      <PatientSelect
                        value={form.patientId || ''}
                        onChange={(id, p) => {
                          setForm(prev => ({ ...prev, patientId: id }));
                          if (p?.email) setPatientEmailOverride('');
                        }}
                        required
                        initialPatients={patients}
                        label="Select Registered Patient"
                        placeholder="Type patient name, phone number, or ID to select..."
                      />
                    </div>
                  );
                }

                // Smart dropdown for Assigned To in followups
                if (f.name === 'assignedTo' && module === 'followups' && staffList.length > 0) {
                  return (
                    <label className="field" key={f.name}>
                      {f.label}
                      <select
                        value={form.assignedTo || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setForm({ ...form, assignedTo: val });
                          const matched = staffList.find(s => s.fullName === val);
                          if (matched && matched.email && !selectedStaffEmails.includes(matched.email.toLowerCase())) {
                            setSelectedStaffEmails(prev => [...prev, matched.email.toLowerCase()]);
                          }
                        }}
                      >
                        <option value="">Select Doctor or Staff</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.fullName}>
                            {s.fullName} ({s.role.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label className="field" key={f.name}>
                    {f.label}
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={form[f.name] || ''}
                        onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    ) : f.options ? (
                      <select
                        required
                        value={form[f.name] || ''}
                        onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      >
                        <option value="">Select</option>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        required={f.name.includes('Date') || f.name === 'amount'}
                        type={f.type || 'text'}
                        value={form[f.name] || ''}
                        onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    )}
                  </label>
                );
              })}

              {/* Follow-up Email Recipients Panel */}
              {module === 'followups' && (
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '16px', background: '#f8fafc', border: '1.5px solid #dce6ed', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📧</span> Email Notifications & Reminders
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      Customizable
                    </span>
                  </div>

                  {/* Patient Email */}
                  <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={notifyPatient}
                        onChange={e => setNotifyPatient(e.target.checked)}
                      />
                      <span>Send confirmation & reminder to Patient</span>
                    </label>
                    {notifyPatient && (
                      <div style={{ marginTop: '8px', marginLeft: '24px' }}>
                        <input
                          type="email"
                          placeholder={patientMap[form.patientId]?.email || "Enter patient's email address"}
                          value={patientEmailOverride}
                          onChange={e => setPatientEmailOverride(e.target.value)}
                          style={{ width: '100%', maxWidth: '380px', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                        />
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                          {patientMap[form.patientId]?.email
                            ? `Registered email: ${patientMap[form.patientId]?.email}`
                            : 'Patient has no email registered on profile. You can type one here.'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clinic Staff & Doctors */}
                  <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--ink)' }}>
                      Select Doctors & Staff to notify:
                    </span>
                    {staffList.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                        {staffList.map(s => {
                          const isChecked = selectedStaffEmails.includes(s.email.toLowerCase());
                          return (
                            <label
                              key={s.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: isChecked ? '#edf7fb' : '#fff',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const email = s.email.toLowerCase();
                                  if (e.target.checked) {
                                    setSelectedStaffEmails(prev => [...prev, email]);
                                  } else {
                                    setSelectedStaffEmails(prev => prev.filter(x => x !== email));
                                  }
                                }}
                                style={{ marginTop: '2px' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                  {s.fullName} <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>({s.role.replace('_', ' ')})</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.email}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="subtle" style={{ fontSize: '12px', margin: 0 }}>No clinic staff email addresses found.</p>
                    )}
                  </div>

                  {/* Additional custom emails */}
                  <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--ink)' }}>
                      Add Additional Email Address:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="email"
                        placeholder="e.g. reception@clinic.com or another doctor's email"
                        value={customEmailInput}
                        onChange={e => setCustomEmailInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomEmail(); } }}
                        style={{ width: '100%', maxWidth: '380px', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                      />
                      <button type="button" className="button secondary" onClick={addCustomEmail} style={{ padding: '6px 12px', fontSize: '12px' }}>
                        + Add Email
                      </button>
                    </div>
                    {customEmails.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {customEmails.map(em => (
                          <span key={em} style={{ background: '#e2e8f0', color: '#1e293b', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {em}
                            <button
                              type="button"
                              onClick={() => setCustomEmails(customEmails.filter(x => x !== em))}
                              style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: 0, color: 'var(--danger)' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Email delivery options */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      <input type="checkbox" checked={sendEmailNow} onChange={e => setSendEmailNow(e.target.checked)} />
                      <span>⚡ Send branded confirmation email immediately</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      <input type="checkbox" checked={scheduleReminder} onChange={e => setScheduleReminder(e.target.checked)} />
                      <span>⏰ Queue reminder on follow-up date</span>
                    </label>
                  </div>
                </div>
              )}
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
