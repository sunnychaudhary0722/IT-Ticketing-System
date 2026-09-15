import React from 'react';
import {
  Search,
  Clock,
  User as UserIcon,
  Headphones,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  FilterX
} from 'lucide-react';

export const TicketList = ({
  tickets,
  userRole,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  filterType,
  onFilterTypeChange,
  onSelectTicket,
  onOpenNewTicketModal,
  onDeleteTicket,
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <span className="badge-status status-open">Open</span>;
      case 'In Progress':
        return <span className="badge-status status-in-progress">In Progress</span>;
      case 'Resolved':
        return <span className="badge-status status-resolved">Resolved</span>;
      case 'Closed':
        return <span className="badge-status status-closed">Closed</span>;
      default:
        return <span className="badge-status">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="badge-priority priority-critical">Critical</span>;
      case 'High':
        return <span className="badge-priority priority-high">High</span>;
      case 'Medium':
        return <span className="badge-priority priority-medium">Medium</span>;
      case 'Low':
        return <span className="badge-priority priority-low">Low</span>;
      default:
        return <span className="badge-priority">{priority}</span>;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="ticket-list-section">
      {/* Top action headline */}
      <div className="page-top-bar">
        <div className="page-headline">
          <h1>
            {userRole === 'user'
              ? 'My Support Tickets'
              : userRole === 'support'
              ? 'Support Ticket Queue'
              : 'All System Tickets'}
          </h1>
          <p>
            {userRole === 'user'
              ? 'Submit issues, track real-time technician updates, and verify resolutions.'
              : userRole === 'support'
              ? 'Review assigned tickets, resolve client issues, and add internal notes.'
              : 'Supervise ticket volume, assign support staff, and manage lifecycle status.'}
          </p>
        </div>

        {/* ONLY User can create tickets - Admin and Support cannot */}
        {userRole === 'user' && onOpenNewTicketModal && (
          <button type="button" className="btn btn-primary" onClick={onOpenNewTicketModal}>
            <Plus size={16} /> Create Support Ticket
          </button>
        )}
      </div>

      {/* Role-Specific Filter Subtabs for Support / Admin */}
      {(userRole === 'support' || userRole === 'admin') && (
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${filterType === 'all' ? 'tab-btn-active' : ''}`}
            onClick={() => onFilterTypeChange('all')}
          >
            All Tickets
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'unassigned' ? 'tab-btn-active' : ''}`}
            onClick={() => onFilterTypeChange('unassigned')}
          >
            Unassigned Queue
          </button>
          {userRole === 'support' && (
            <button
              type="button"
              className={`tab-btn ${filterType === 'my' ? 'tab-btn-active' : ''}`}
              onClick={() => onFilterTypeChange('my')}
            >
              Assigned To Me
            </button>
          )}
        </div>
      )}

      {/* Filter & Live Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID (e.g. TICK-1001), title, or details..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          {/* Status filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            aria-label="Filter by Priority"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Category filter */}
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network">Network</option>
            <option value="Account">Account</option>
            <option value="Security">Security</option>
            <option value="Other">Other</option>
          </select>

          {(search || statusFilter || priorityFilter || categoryFilter || filterType !== 'all') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('');
                onPriorityFilterChange('');
                onCategoryFilterChange('');
                onFilterTypeChange('all');
              }}
              title="Reset all filters"
            >
              <FilterX size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <AlertCircle size={24} />
          </div>
          <div className="empty-state-title">No tickets found</div>
          <div className="empty-state-text">
            {userRole === 'user'
              ? 'You have not submitted any tickets matching the current criteria.'
              : 'No tickets match the selected filters or search parameters.'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('');
                onPriorityFilterChange('');
                onCategoryFilterChange('');
                onFilterTypeChange('all');
              }}
            >
              Clear Filters
            </button>
            {userRole === 'user' && onOpenNewTicketModal && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenNewTicketModal}
              >
                <Plus size={14} /> Create Ticket
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="ticket-card"
              onClick={() => onSelectTicket(t)}
            >
              <div className="ticket-card-header">
                <div className="ticket-card-header-main">
                  <div className="ticket-card-meta">
                    <span className="ticket-code">{t.ticketId}</span>
                    <span className="badge-category">{t.category}</span>
                    {getPriorityBadge(t.priority)}
                    {getStatusBadge(t.status)}
                  </div>
                  <h3 className="ticket-card-title">{t.title}</h3>
                </div>

                <div className="ticket-card-actions">
                  {/* Admin Delete Action */}
                  {userRole === 'admin' && onDeleteTicket && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm delete-btn"
                      onClick={(e) => onDeleteTicket(t.id, e)}
                      title="Delete Ticket (Admin)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  <div className="ticket-card-arrow">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>

              <p className="ticket-card-desc">{t.description}</p>

              <div className="ticket-card-footer">
                <div className="ticket-footer-left">
                  <span className="meta-user">
                    <UserIcon size={13} />
                    <strong>{t.createdBy.name}</strong>
                    {t.createdBy.department && (
                      <span className="meta-dept">({t.createdBy.department})</span>
                    )}
                  </span>

                  <span className="meta-assignee">
                    <Headphones size={13} />
                    {t.assignedTo ? (
                      <span>Assigned to: <strong>{t.assignedTo.name}</strong></span>
                    ) : (
                      <span className="unassigned-text">Unassigned</span>
                    )}
                  </span>
                </div>

                <div className="ticket-footer-right">
                  <Clock size={13} />
                  <span>Updated {formatDate(t.updatedAt || t.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
