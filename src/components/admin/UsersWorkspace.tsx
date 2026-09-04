"use client";
import { type FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

type User = { id: string; name: string; email: string; role: string; permissions: string[]; status?: string };

export function UsersWorkspace() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ role: 'RECEPTION' });
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState('');

  // Reset password state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetId, setResetId] = useState('');
  const [resetName, setResetName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Deactivate/Activate confirm
  const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'activate'; id: string; name: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const s = sessionStore.get();

  const load = () => {
    if (s) api<{ items: User[] }>('users.list', {}, s.token).then(x => setUsers(x.items)).catch(e => setError(e.message));
  };

  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true); setError('');
    try {
      await api('users.create', form, s.token);
      setOpen(false); setForm({ role: 'RECEPTION' }); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create account.'); }
    finally { setSaving(false); }
  }

  function startEdit(u: User) {
    setEditId(u.id);
    setEditForm({ fullName: u.name, email: u.email, username: '', role: u.role });
    setEditOpen(true); setError(''); setSuccessMsg('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true); setError('');
    try {
      await api('users.update', { userId: editId, ...editForm }, s.token);
      setEditOpen(false); setSuccessMsg('User updated successfully.'); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update user.'); }
    finally { setSaving(false); }
  }

  function startResetPw(u: User) {
    setResetId(u.id); setResetName(u.name); setNewPassword('');
    setResetOpen(true); setError(''); setSuccessMsg('');
  }

  async function submitResetPw(e: FormEvent) {
    e.preventDefault();
    if (!s || !newPassword) return;
    setSaving(true); setError('');
    try {
      await api('users.resetPassword', { userId: resetId, password: newPassword }, s.token);
      setResetOpen(false); setNewPassword('');
      setSuccessMsg(`Password for "${resetName}" has been reset.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reset password.'); }
    finally { setSaving(false); }
  }

  async function doConfirmAction() {
    if (!confirmAction || !s) return;
    setConfirmBusy(true); setError('');
    try {
      await api(confirmAction.type === 'deactivate' ? 'users.deactivate' : 'users.activate', { userId: confirmAction.id }, s.token);
      setConfirmAction(null); setSuccessMsg(`User "${confirmAction.name}" has been ${confirmAction.type}d.`); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); setConfirmAction(null); }
    finally { setConfirmBusy(false); }
  }

  return (
    <AppShell title="Administration">
      <div className="page-title">
        <div>
          <h2>Users &amp; access</h2>
          <p className="subtle">Manage staff accounts and least-privilege roles.</p>
        </div>
        <button className="button" onClick={() => { setOpen(true); setError(''); setSuccessMsg(''); }}>Add user</button>
      </div>
      {successMsg && <div className="form-success">{successMsg}</div>}
      {error && <div className="form-error">{error}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Permissions</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.length ? users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><span className={`badge ${u.status === 'Disabled' ? 'badge-muted' : ''}`}>{u.status || 'Active'}</span></td>
                  <td>{u.permissions.includes('*') ? 'All permissions' : u.permissions.length + ' assigned'}</td>
                  <td className="row-actions">
                    <button className="btn-icon" title="Edit user" onClick={() => startEdit(u)}>✏️</button>
                    <button className="btn-icon" title="Reset password" onClick={() => startResetPw(u)}>🔑</button>
                    {(u.status || 'Active') === 'Active'
                      ? <button className="btn-icon" title="Deactivate" onClick={() => setConfirmAction({ type: 'deactivate', id: u.id, name: u.name })}>🚫</button>
                      : <button className="btn-icon" title="Activate" onClick={() => setConfirmAction({ type: 'activate', id: u.id, name: u.name })}>✅</button>
                    }
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className="empty">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create User Modal */}
      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <h2>Create staff account</h2>
            <div className="grid2">
              {[['fullName', 'Full name'], ['email', 'Email'], ['username', 'Username'], ['password', 'Temporary password']].map(([k, l]) => (
                <label className="field" key={k}>{l}<input required type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>
              ))}
              <label className="field">Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTION'].map(x => <option key={x}>{x}</option>)}</select></label>
            </div>
            <div className="actions">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="button" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit user" subtitle={`Editing account ${editId}`}>
        <form onSubmit={saveEdit}>
          <div className="grid2">
            <label className="field">Full name<input required value={editForm.fullName || ''} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} /></label>
            <label className="field">Email<input type="email" required value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>
            <label className="field">Username<input value={editForm.username || ''} onChange={e => setEditForm({ ...editForm, username: e.target.value })} placeholder="Leave blank to keep current" /></label>
            <label className="field">Role<select value={editForm.role || ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>{['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTION'].map(x => <option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password" subtitle={`Set a new password for "${resetName}"`}>
        <form onSubmit={submitResetPw}>
          <label className="field">New password
            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </label>
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => setResetOpen(false)}>Cancel</button>
            <button className="button" disabled={saving}>{saving ? 'Resetting…' : 'Reset password'}</button>
          </div>
        </form>
      </Modal>

      {/* Deactivate/Activate Confirmation */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={doConfirmAction}
        title={confirmAction?.type === 'deactivate' ? 'Deactivate account' : 'Activate account'}
        message={confirmAction?.type === 'deactivate'
          ? `Are you sure you want to deactivate "${confirmAction?.name}"? They will no longer be able to sign in.`
          : `Are you sure you want to re-activate "${confirmAction?.name}"? They will be able to sign in again.`}
        confirmLabel={confirmAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        danger={confirmAction?.type === 'deactivate'}
        busy={confirmBusy}
      />
    </AppShell>
  );
}
