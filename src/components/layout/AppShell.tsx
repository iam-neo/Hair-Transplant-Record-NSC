"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { sessionStore, can } from "@/lib/auth/session";
import { authApi } from "@/lib/api/client";
import { Modal } from "@/components/ui/Modal";
import type { SessionUser } from "@/types";

const nav = [["Dashboard","/dashboard","reports.view"],["Patients","/patients","patients.view"],["Consultations","/consultations","consultations.view"],["Assessments","/assessments","assessments.view"],["Procedures","/procedures","procedures.view"],["Photos","/photos","photos.view"],["Follow-ups","/followups","followups.view"],["Payments","/payments","payments.view"],["Documents","/documents","documents.view"],["Reports","/reports","reports.view"],["Activity Logs","/activity","audit_logs.view"],["Administration","/administration/users","users.view"]] as const;

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');
  const [profileForm, setProfileForm] = useState({ fullName: '', username: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => {
    const s = sessionStore.get();
    if (!s) { router.replace('/login'); return; }
    setUser(s.user);
    setProfileForm({ fullName: s.user.name, username: '' });
  }, [router]);

  const logout = () => { sessionStore.clear(); router.replace('/login'); };

  const openProfile = () => {
    const s = sessionStore.get();
    if (s) setProfileForm({ fullName: s.user.name, username: '' });
    setProfileErr(''); setProfileMsg(''); setProfileTab('profile'); setProfileOpen(true);
  };

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const s = sessionStore.get();
    if (!s) return;
    setProfileBusy(true); setProfileErr(''); setProfileMsg('');
    try {
      const res = await authApi.updateProfile(s.token, profileForm.fullName, profileForm.username || s.user.name);
      sessionStore.set({ token: s.token, user: res.user });
      setUser(res.user);
      setProfileMsg('Profile updated successfully.');
    } catch (e) { setProfileErr(e instanceof Error ? e.message : 'Could not update profile.'); }
    finally { setProfileBusy(false); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setProfileErr('New passwords do not match.'); return; }
    if (pwForm.newPassword.length < 8) { setProfileErr('New password must be at least 8 characters.'); return; }
    const s = sessionStore.get();
    if (!s) return;
    setProfileBusy(true); setProfileErr(''); setProfileMsg('');
    try {
      await authApi.changePassword(s.token, pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfileMsg('Password changed successfully. Use your new password the next time you sign in.');
    } catch (e) { setProfileErr(e instanceof Error ? e.message : 'Could not change password.'); }
    finally { setProfileBusy(false); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <Image src="/Skin_logo.png" width={39} height={39} alt="Nepalgunj Skin Center" />
          <span>Nepalgunj Skin Center</span>
        </div>
        <nav>
          {nav.filter(([, , p]) => can(user, p)).map(([label, href]) => (
            <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <button className="logout" onClick={logout}>Sign out</button>
      </aside>
      <main className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user" style={{ cursor: 'pointer' }} onClick={openProfile} title="Profile & Security">
            <span>{user?.name || 'Loading…'}</span>
            <span className="avatar">{user?.name?.slice(0, 1).toUpperCase() || '•'}</span>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>

      {/* Profile & Security Modal */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Profile & Security" subtitle="Update your account details or change your password.">
        <div className="tab-bar">
          <button type="button" className={`tab ${profileTab === 'profile' ? 'active' : ''}`} onClick={() => { setProfileTab('profile'); setProfileErr(''); setProfileMsg(''); }}>Profile</button>
          <button type="button" className={`tab ${profileTab === 'password' ? 'active' : ''}`} onClick={() => { setProfileTab('password'); setProfileErr(''); setProfileMsg(''); }}>Password</button>
        </div>
        {profileMsg && <div className="form-success">{profileMsg}</div>}
        {profileErr && <div className="form-error">{profileErr}</div>}

        {profileTab === 'profile' ? (
          <form onSubmit={saveProfile}>
            <div className="grid2">
              <label className="field">Full Name
                <input required value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} />
              </label>
              <label className="field">Username
                <input placeholder={user?.name || ''} value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value })} />
              </label>
            </div>
            <label className="field">Email
              <input disabled value={user?.email || ''} />
            </label>
            <label className="field">Role
              <input disabled value={user?.role || ''} />
            </label>
            <div className="actions">
              <button type="button" className="button secondary" onClick={() => setProfileOpen(false)}>Close</button>
              <button className="button" disabled={profileBusy}>{profileBusy ? 'Saving…' : 'Update profile'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={changePassword}>
            <label className="field">Current password
              <input required type="password" autoComplete="current-password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </label>
            <label className="field">New password
              <input required type="password" autoComplete="new-password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </label>
            <label className="field">Confirm new password
              <input required type="password" autoComplete="new-password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </label>
            <div className="actions">
              <button type="button" className="button secondary" onClick={() => setProfileOpen(false)}>Close</button>
              <button className="button" disabled={profileBusy}>{profileBusy ? 'Changing…' : 'Change password'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
