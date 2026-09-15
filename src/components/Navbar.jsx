import React from 'react';
import { Shield, Headphones, UserCheck, LogOut } from 'lucide-react';

export const Navbar = ({ user, onLogout }) => {
  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'admin') {
      return (
        <span className="role-badge role-badge-admin">
          <Shield size={12} /> Administrator
        </span>
      );
    }
    if (user.role === 'support') {
      return (
        <span className="role-badge role-badge-support">
          <Headphones size={12} /> Support Specialist
        </span>
      );
    }
    return (
      <span className="role-badge role-badge-user">
        <UserCheck size={12} /> Employee
      </span>
    );
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-section">
          <div className="brand-icon">IT</div>
          <div>
            <div className="brand-title">Help Desk &amp; Ticketing System</div>
          </div>
        </div>

        <div className="nav-actions">
          {user && (
            <div className="nav-user-group">
              {/* User Profile Button / Pill */}
              <div className="nav-user-btn" title={`Logged in as ${user.name} (${user.role})`}>
                <div className="nav-user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="nav-user-meta">
                  <span className="nav-user-name">{user.name}</span>
                  <div className="nav-user-role-badge">{getRoleBadge()}</div>
                </div>
              </div>

              {/* Sign Out Button with identical dimensions */}
              <button
                type="button"
                className="nav-signout-btn"
                onClick={onLogout}
                title="Sign Out of Account"
              >
                <LogOut size={15} />
                <span className="logout-text">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
