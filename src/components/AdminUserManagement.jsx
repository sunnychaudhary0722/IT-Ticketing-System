import React, { useState, useEffect } from 'react';
import { apiGetUsers, apiCreateUser, apiToggleUserStatus, apiChangeUserRole } from '../api';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Headphones,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Wrench,
  Building2,
  Mail,
  User as UserIcon
} from 'lucide-react';

export const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // New User Modal State (Focused on provisioning Support Staff)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [newRole, setNewRole] = useState('support');
  const [newDepartment, setNewDepartment] = useState('IT Support & Infrastructure');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);
  const [modalError, setModalError] = useState(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowModalPassword(true);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGetUsers(roleFilter, search);
      setUsers(res.users);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (userId) => {
    try {
      await apiToggleUserStatus(userId);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to change status');
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      await apiChangeUserRole(userId, role);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setSubmittingUser(true);
    setModalError(null);
    try {
      await apiCreateUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        department: newDepartment.trim(),
        specialty: newSpecialty.trim(),
      });
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewSpecialty('');
      await loadUsers();
    } catch (err) {
      setModalError(err.message || 'Failed to create user account');
    } finally {
      setSubmittingUser(false);
    }
  };

  return (
    <div className="admin-management-section">
      <div className="page-top-bar">
        <div className="page-headline">
          <h1>User &amp; Support Team Administration</h1>
          <p>
            Provision IT Support Specialists, manage employee accounts, and supervise role-based permissions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setNewRole('support');
            setNewDepartment('IT Support & Infrastructure');
            setShowAddModal(true);
          }}
        >
          <UserPlus size={16} /> Provision Support Team Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, corporate email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-selects">
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="user">Employees (Users)</option>
            <option value="support">Support Specialists</option>
            <option value="admin">Administrators</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name &amp; Corporate Email</th>
              <th>System Role</th>
              <th>Department / Focus</th>
              <th>Account Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No accounts found. Use the &quot;Provision Support Team Account&quot; button above to create one.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {u.email}
                    </div>
                  </td>
                  <td>
                    <select
                      className="filter-select"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                    >
                      <option value="user">Employee (User)</option>
                      <option value="support">Support Specialist</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td>
                    {u.department && (
                      <span style={{ display: 'block', fontSize: '0.8rem' }}>{u.department}</span>
                    )}
                    {u.specialty && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Focus: {u.specialty}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        backgroundColor: u.status === 'active' ? '#ecfdf5' : '#fef2f2',
                        color: u.status === 'active' ? '#047857' : '#b91c1c',
                      }}
                    >
                      {u.status === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${u.status === 'active' ? 'btn-secondary' : 'btn-success'}`}
                      style={{ fontSize: '0.725rem', padding: '0.2rem 0.6rem' }}
                      onClick={() => handleToggleStatus(u.id)}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Support/Staff Account Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-content modal-content-wide provision-modal-card" style={{ maxHeight: 'calc(100vh - 3rem)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #334155',
                    flexShrink: 0
                  }}
                >
                  <Headphones size={20} />
                </div>
                <div>
                  <div className="modal-title" style={{ fontSize: '1.15rem' }}>Provision Support Specialist</div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {modalError && (
                  <div className="alert alert-danger">
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <div>{modalError}</div>
                  </div>
                )}

                <div className="provision-policy-banner">
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <Shield size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.45 }}>
                      <strong>Administrator Provisioning Access:</strong> Support specialist accounts cannot self-register. Creating an account here will immediately grant internal access to resolve, comment on, and manage assigned tickets.
                    </div>
                  </div>
                </div>

                {/* Section 1: Credentials */}
                <div className="provision-section">
                  <div className="provision-section-title">
                    <UserIcon size={15} />
                    <span>Identity &amp; Credentials</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. David Kim"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Corporate Email Address *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="email"
                        required
                        className="form-input"
                        placeholder="e.g. david.kim@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        style={{ paddingRight: '2rem' }}
                      />
                      <Mail size={15} style={{ position: 'absolute', right: '0.75rem', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label">Initial Password *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="link-button"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                      >
                        <Sparkles size={12} /> Auto-Generate
                      </button>
                    </div>
                    <div className="password-input-wrapper">
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        required
                        className="form-input"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        tabIndex={-1}
                        title={showModalPassword ? 'Hide password' : 'Show password'}
                      >
                        {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span className="form-helper-text">
                      Staff member will use this to sign in.
                    </span>
                  </div>
                </div>

                {/* Section 2: Role & Department */}
                <div className="provision-section">
                  <div className="provision-section-title">
                    <Building2 size={15} />
                    <span>Role &amp; Department Allocation</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Assigned Role *</label>
                      <select
                        className="form-select"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                      >
                        <option value="support">Support Specialist</option>
                        <option value="admin">Administrator</option>
                        <option value="user">Employee (Standard User)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Department *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. IT Support &amp; Infrastructure"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick Department Suggestions */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '-0.25rem' }}>
                    {['IT Support & Infrastructure', 'Cloud Systems', 'Information Security', 'Network Operations'].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        className="chip-btn"
                        onClick={() => setNewDepartment(dept)}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Queue & Technical Specialization (when support is selected) */}
                {newRole === 'support' && (
                  <div className="provision-section">
                    <div className="provision-section-title">
                      <Wrench size={15} />
                      <span>Technical Specialization &amp; Queue Focus</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Primary Technical Focus</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Hardware, Network, Cloud Systems, Security"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', display: 'block' }}>
                        Quick Select Specialization:
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {[
                          'Hardware & Workstations',
                          'Network & VPN',
                          'Cloud & DevOps',
                          'Identity & Access (IAM)',
                          'Office 365 & SaaS',
                          'Security & Compliance'
                        ].map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            className={`chip-btn ${newSpecialty.includes(spec) ? 'chip-btn-active' : ''}`}
                            onClick={() => {
                              if (!newSpecialty) {
                                setNewSpecialty(spec);
                              } else if (newSpecialty.includes(spec)) {
                                setNewSpecialty(
                                  newSpecialty
                                    .replace(spec, '')
                                    .replace(/,\s*,/g, ',')
                                    .replace(/^,\s*|,\s*$/g, '')
                                    .trim()
                                );
                              } else {
                                setNewSpecialty(`${newSpecialty}, ${spec}`);
                              }
                            }}
                          >
                            <Check size={11} style={{ display: newSpecialty.includes(spec) ? 'inline-block' : 'none' }} />
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="modal-footer" style={{ flexShrink: 0, padding: '1rem 1.5rem', background: '#f8fafc' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingUser}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <UserPlus size={16} />
                  <span>{submittingUser ? 'Provisioning Account...' : 'Provision Specialist Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
