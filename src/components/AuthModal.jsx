import React, { useState } from 'react';
import { apiLogin, apiRegister } from '../api';
import { LogIn, UserPlus, KeyRound, AlertCircle, Eye, EyeOff, Shield, User as UserIcon } from 'lucide-react';

export const AuthModal = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [department, setDepartment] = useState('Engineering');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const data = await apiRegister(name.trim(), email.trim(), password, department, role);
        localStorage.setItem('helpdesk_token', data.token);
        onAuthSuccess(data.user, data.token);
      } else {
        const data = await apiLogin(email.trim(), password);
        localStorage.setItem('helpdesk_token', data.token);
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <KeyRound size={26} />
          </div>
          <h1 className="auth-title">
            IT Help Desk Portal
          </h1>
        </div>

        {/* Card Form */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${!isRegister ? 'auth-tab-btn-active' : ''}`}
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${isRegister ? 'auth-tab-btn-active' : ''}`}
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
            >
              <UserPlus size={16} /> Register Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="alert alert-danger">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{error}</div>
              </div>
            )}

            {isRegister && (
              <>
                {/* Account Type Selector: User vs Admin */}
                <div className="form-group">
                  <label className="form-label">Registering As</label>
                  <div className="role-selector-grid">
                    <button
                      type="button"
                      className={`role-select-card ${role === 'user' ? 'role-select-card-active' : ''}`}
                      onClick={() => {
                        setRole('user');
                        setDepartment('Engineering');
                      }}
                    >
                      <div className="role-select-card-header">
                        <UserIcon size={16} />
                        <strong>Employee / User</strong>
                      </div>
                      <span className="role-select-desc">Report and track technical issues</span>
                    </button>

                    <button
                      type="button"
                      className={`role-select-card ${role === 'admin' ? 'role-select-card-active' : ''}`}
                      onClick={() => {
                        setRole('admin');
                        setDepartment('IT Administration');
                      }}
                    >
                      <div className="role-select-card-header">
                        <Shield size={16} />
                        <strong>Administrator</strong>
                      </div>
                      <span className="role-select-desc">Manage support staff and triage queue</span>
                    </button>
                  </div>

                  <div className="support-policy-note">
                    <strong>Support Team Note:</strong> Support team accounts cannot be self-registered. They are created exclusively by Administrators from the Staff Management dashboard.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {role === 'user' ? (
                      <>
                        <option value="Engineering">Engineering</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Finance">Finance</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Operations">Operations</option>
                        <option value="Sales">Sales</option>
                        <option value="Customer Success">Customer Success</option>
                        <option value="Product">Product Management</option>
                      </>
                    ) : (
                      <>
                        <option value="IT Administration">IT Administration</option>
                        <option value="Security Operations">Security Operations</option>
                        <option value="Corporate Systems">Corporate Systems</option>
                        <option value="Executive Staff">Executive Staff</option>
                      </>
                    )}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. alex.morgan@company.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isRegister && (
                <span className="form-helper-text">
                  Minimum 6 characters.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? `Create ${role === 'admin' ? 'Administrator' : 'User'} Account`
                : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
