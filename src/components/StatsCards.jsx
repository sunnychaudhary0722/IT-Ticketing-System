import React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Archive,
  AlertOctagon,
  Users,
  Headphones,
  UserCheck
} from 'lucide-react';

export const StatsCards = ({
  stats,
  role,
  currentFilterStatus,
  onSelectStatusFilter,
  currentFilterType,
  onSelectFilterType,
}) => {
  if (role === 'user') {
    return (
      <div className="stats-grid">
        <div
          className={`stat-card ${currentFilterStatus === '' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('')}
          title="Click to view all my tickets"
        >
          <div className="stat-card-header">
            <span>My Tickets</span>
            <Inbox size={16} color="#3b82f6" />
          </div>
          <div className="stat-card-value">{stats.totalTickets ?? 0}</div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Open' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Open')}
          title="Click to view open tickets"
        >
          <div className="stat-card-header">
            <span>Open</span>
            <Clock size={16} color="#2563eb" />
          </div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>
            {stats.openTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'In Progress' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('In Progress')}
          title="Click to view in-progress tickets"
        >
          <div className="stat-card-header">
            <span>In Progress</span>
            <AlertOctagon size={16} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>
            {stats.inProgressTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Resolved' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Resolved')}
          title="Click to view resolved tickets awaiting confirmation"
        >
          <div className="stat-card-header">
            <span>Resolved</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {stats.resolvedTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Closed' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Closed')}
          title="Click to view closed tickets"
        >
          <div className="stat-card-header">
            <span>Closed</span>
            <Archive size={16} color="#64748b" />
          </div>
          <div className="stat-card-value" style={{ color: '#64748b' }}>
            {stats.closedTickets ?? 0}
          </div>
        </div>
      </div>
    );
  }

  if (role === 'support') {
    return (
      <div className="stats-grid">
        <div
          className={`stat-card ${currentFilterType === 'all' && currentFilterStatus === '' ? 'stat-card-active' : ''}`}
          onClick={() => {
            onSelectFilterType?.('all');
            onSelectStatusFilter('');
          }}
          title="All tickets in system"
        >
          <div className="stat-card-header">
            <span>Total Tickets</span>
            <Inbox size={16} color="#3b82f6" />
          </div>
          <div className="stat-card-value">{stats.totalTickets ?? 0}</div>
        </div>

        <div
          className={`stat-card ${currentFilterType === 'unassigned' ? 'stat-card-active' : ''}`}
          onClick={() => {
            onSelectFilterType?.('unassigned');
            onSelectStatusFilter('');
          }}
          title="Tickets awaiting staff assignment"
        >
          <div className="stat-card-header">
            <span>Unassigned</span>
            <AlertOctagon size={16} color="#ef4444" />
          </div>
          <div className="stat-card-value" style={{ color: '#dc2626' }}>
            {stats.unassignedTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterType === 'my' ? 'stat-card-active' : ''}`}
          onClick={() => {
            onSelectFilterType?.('my');
            onSelectStatusFilter('');
          }}
          title="Tickets assigned to you"
        >
          <div className="stat-card-header">
            <span>My Assigned</span>
            <UserCheck size={16} color="#2563eb" />
          </div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>
            {stats.myTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Open' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Open')}
          title="Open tickets"
        >
          <div className="stat-card-header">
            <span>Open</span>
            <Clock size={16} color="#3b82f6" />
          </div>
          <div className="stat-card-value">{stats.openTickets ?? 0}</div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'In Progress' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('In Progress')}
          title="Tickets currently being worked on"
        >
          <div className="stat-card-header">
            <span>In Progress</span>
            <AlertOctagon size={16} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>
            {stats.inProgressTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Resolved' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Resolved')}
          title="Resolved tickets awaiting user closure"
        >
          <div className="stat-card-header">
            <span>Resolved</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {stats.resolvedTickets ?? 0}
          </div>
        </div>

        <div
          className={`stat-card ${currentFilterStatus === 'Closed' ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatusFilter('Closed')}
          title="Closed tickets"
        >
          <div className="stat-card-header">
            <span>Closed</span>
            <Archive size={16} color="#64748b" />
          </div>
          <div className="stat-card-value" style={{ color: '#64748b' }}>
            {stats.closedTickets ?? 0}
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-card-header">
          <span>Total Users</span>
          <Users size={16} color="#6366f1" />
        </div>
        <div className="stat-card-value" style={{ color: '#4f46e5' }}>
          {stats.totalUsers ?? 0}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span>Support Staff</span>
          <Headphones size={16} color="#0284c7" />
        </div>
        <div className="stat-card-value" style={{ color: '#0284c7' }}>
          {stats.supportStaffCount ?? 0}
        </div>
      </div>

      <div
        className={`stat-card ${currentFilterStatus === '' ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatusFilter('')}
        title="All tickets"
      >
        <div className="stat-card-header">
          <span>Total Tickets</span>
          <Inbox size={16} color="#3b82f6" />
        </div>
        <div className="stat-card-value">{stats.totalTickets ?? 0}</div>
      </div>

      <div
        className={`stat-card ${currentFilterStatus === 'Open' ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatusFilter('Open')}
        title="Open tickets"
      >
        <div className="stat-card-header">
          <span>Open</span>
          <Clock size={16} color="#2563eb" />
        </div>
        <div className="stat-card-value" style={{ color: '#2563eb' }}>
          {stats.openTickets ?? 0}
        </div>
      </div>

      <div
        className={`stat-card ${currentFilterStatus === 'In Progress' ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatusFilter('In Progress')}
        title="In-progress tickets"
      >
        <div className="stat-card-header">
          <span>In Progress</span>
          <AlertOctagon size={16} color="#f59e0b" />
        </div>
        <div className="stat-card-value" style={{ color: '#d97706' }}>
          {stats.inProgressTickets ?? 0}
        </div>
      </div>

      <div
        className={`stat-card ${currentFilterStatus === 'Resolved' ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatusFilter('Resolved')}
        title="Resolved tickets"
      >
        <div className="stat-card-header">
          <span>Resolved</span>
          <CheckCircle2 size={16} color="#10b981" />
        </div>
        <div className="stat-card-value" style={{ color: '#059669' }}>
          {stats.resolvedTickets ?? 0}
        </div>
      </div>

      <div
        className={`stat-card ${currentFilterStatus === 'Closed' ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatusFilter('Closed')}
        title="Closed tickets"
      >
        <div className="stat-card-header">
          <span>Closed</span>
          <Archive size={16} color="#64748b" />
        </div>
        <div className="stat-card-value" style={{ color: '#64748b' }}>
          {stats.closedTickets ?? 0}
        </div>
      </div>

      <div
        className="stat-card"
        onClick={() => {
          onSelectFilterType?.('unassigned');
          onSelectStatusFilter('');
        }}
        title="Unassigned tickets"
      >
        <div className="stat-card-header">
          <span>Unassigned</span>
          <AlertOctagon size={16} color="#ef4444" />
        </div>
        <div className="stat-card-value" style={{ color: '#dc2626' }}>
          {stats.unassignedTickets ?? 0}
        </div>
      </div>
    </div>
  );
};
