import React, { useState, useEffect } from 'react';
import {
  apiGetTicketDetails,
  apiUpdateTicketStatus,
  apiAssignTicket,
  apiChangePriority,
  apiAddComment,
  apiGetUsers,
  apiDeleteTicket
} from '../api';
import {
  ArrowLeft,
  Clock,
  User as UserIcon,
  Headphones,
  Shield,
  Send,
  Lock,
  MessageSquare,
  CheckCircle2,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle
} from 'lucide-react';

export const TicketDetail = ({
  ticketId,
  currentUser,
  onBack,
  onTicketUpdated,
}) => {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Comment Form
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Support staff list for Admin assignment
  const [supportStaffList, setSupportStaffList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // Reopen prompt state
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetTicketDetails(ticketId);
      setTicket(data.ticket);
      setComments(data.comments);
      setSelectedAssignee(data.ticket.assignedTo ? data.ticket.assignedTo.id : '');
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();

    // If admin, fetch staff list for assignment options (ONLY admin can assign)
    if (currentUser.role === 'admin') {
      apiGetUsers('support')
        .then((res) => setSupportStaffList(res.users))
        .catch(() => {});
    }
  }, [ticketId]);

  // Handle Comment Submission
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmittingComment(true);
    try {
      await apiAddComment(ticketId, message.trim(), isInternal ? 'internal' : 'comment');
      setMessage('');
      setIsInternal(false);
      await loadDetails();
      onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Could not post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Status transitions
  const handleStatusChange = async (newStatus, reason) => {
    try {
      await apiUpdateTicketStatus(ticketId, newStatus, reason);
      setShowReopenInput(false);
      setReopenReason('');
      await loadDetails();
      onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Could not update status');
    }
  };

  // Assign Ticket: ONLY Admin can assign
  const handleAssign = async (assigneeId) => {
    if (currentUser.role !== 'admin') {
      alert('Only administrators can assign tickets to support team members.');
      return;
    }
    setUpdatingAssignment(true);
    try {
      await apiAssignTicket(ticketId, assigneeId ? assigneeId : null);
      setSelectedAssignee(assigneeId);
      await loadDetails();
      onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update assignment');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // Change Priority (Admin or Support)
  const handlePriorityChange = async (newPriority) => {
    try {
      await apiChangePriority(ticketId, newPriority);
      await loadDetails();
      onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update priority');
    }
  };

  // Delete Ticket (Admin Only)
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this ticket and all associated comments?')) {
      return;
    }
    try {
      await apiDeleteTicket(ticketId);
      onTicketUpdated();
      onBack();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Loading Ticket Details...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ color: '#ef4444' }}>
          <AlertCircle size={24} />
        </div>
        <div className="empty-state-title">Error Loading Ticket</div>
        <div className="empty-state-text">{error || 'Ticket not found or access denied.'}</div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Tickets
        </button>
      </div>
    );
  }

  const isStaffOrAdmin = currentUser.role === 'support' || currentUser.role === 'admin';

  return (
    <div className="ticket-detail-view">
      {/* Back Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onBack}
        >
          <ArrowLeft size={14} /> Back to Ticket Queue
        </button>
      </div>

      {/* Main Ticket Card */}
      <div className="detail-card">
        {/* Ticket Header */}
        <div className="detail-card-header">
          <div className="detail-header-meta">
            <span className="ticket-code">{ticket.ticketId}</span>
            <span className="badge-category">{ticket.category}</span>

            {/* Priority Badge / Selector */}
            {currentUser.role === 'admin' ? (
              <div className="priority-control">
                <span className="control-label">Priority:</span>
                <select
                  className="filter-select"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            ) : (
              <span className={`badge-priority priority-${ticket.priority.toLowerCase()}`}>
                {ticket.priority} Priority
              </span>
            )}

            {/* Status Badge */}
            <span className={`badge-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
              {ticket.status}
            </span>
          </div>

          {/* Admin Delete Action */}
          {currentUser.role === 'admin' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm delete-btn"
              onClick={handleDelete}
              title="Permanently Delete Ticket"
            >
              <Trash2 size={14} /> Delete Ticket
            </button>
          )}
        </div>

        {/* Ticket Content Body */}
        <div className="detail-card-body">
          <h1 className="detail-title">{ticket.title}</h1>

          <div className="detail-description">
            {ticket.description}
          </div>

          {/* Metadata Grid */}
          <div className="detail-meta-grid">
            <div className="meta-card">
              <span className="meta-label">Created By</span>
              <div className="meta-value">
                <UserIcon size={14} color="#0284c7" />
                {ticket.createdBy.name}
              </div>
              <div className="meta-sub">
                {ticket.createdBy.email} {ticket.createdBy.department ? `• ${ticket.createdBy.department}` : ''}
              </div>
            </div>

            <div className="meta-card">
              <span className="meta-label">Assigned Support Specialist</span>
              {currentUser.role === 'admin' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <select
                    className="filter-select"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                    value={selectedAssignee}
                    disabled={updatingAssignment}
                    onChange={(e) => handleAssign(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {supportStaffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} {staff.department ? `(${staff.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="meta-value" style={{ marginTop: '4px' }}>
                  <Headphones size={14} color="#2563eb" />
                  {ticket.assignedTo ? (
                    <span>{ticket.assignedTo.name}</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Awaiting Admin Assignment</span>
                  )}
                </div>
              )}
              {currentUser.role === 'admin' && (
                <div className="meta-sub" style={{ color: '#64748b' }}>
                  Only Administrators can assign support specialists
                </div>
              )}
            </div>

            <div className="meta-card">
              <span className="meta-label">Submitted On</span>
              <div className="meta-value">
                <Clock size={14} />
                {new Date(ticket.createdAt).toLocaleString()}
              </div>
              {ticket.updatedAt && (
                <div className="meta-sub">
                  Last updated: {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WORKFLOW ACTION BAR */}
        <div className="detail-action-bar">
          {/* USER WORKFLOW ACTIONS */}
          {currentUser.role === 'user' && (
            <div style={{ width: '100%' }}>
              {ticket.status === 'Resolved' && (
                <div className="resolution-banner">
                  <div className="resolution-title">
                    <CheckCircle2 size={18} /> Support marked this ticket as Resolved!
                  </div>
                  <p className="resolution-text">
                    Please verify if your problem has been fixed. Confirm to close the ticket, or reopen if you need further assistance.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleStatusChange('Closed')}
                    >
                      <CheckCircle2 size={16} /> Confirm Resolution &amp; Close Ticket
                    </button>

                    {!showReopenInput ? (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={() => setShowReopenInput(true)}
                      >
                        <RotateCcw size={16} /> Issue Not Fixed? Reopen Ticket
                      </button>
                    ) : (
                      <div className="reopen-form-row">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Describe what is still not functioning..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-warning"
                          onClick={() => handleStatusChange('In Progress', reopenReason)}
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowReopenInput(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {ticket.status === 'Closed' && (
                <div className="closed-banner">
                  <Archive size={16} /> This ticket is closed. If you have another issue, please open a new support ticket.
                </div>
              )}

              {(ticket.status === 'Open' || ticket.status === 'In Progress') && (
                <div className="in-progress-banner">
                  <Clock size={16} /> Your ticket is currently in progress. Updates from the support team will appear in the thread below.
                </div>
              )}
            </div>
          )}

          {/* SUPPORT STAFF WORKFLOW ACTIONS */}
          {currentUser.role === 'support' && (
            <div className="staff-workflow-row">
              <span className="workflow-label">Support Actions:</span>

              {ticket.status === 'Open' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleStatusChange('In Progress')}
                >
                  Mark In Progress
                </button>
              )}

              {ticket.status === 'In Progress' && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleStatusChange('Resolved')}
                >
                  <CheckCircle2 size={16} /> Mark as Resolved (Awaiting User Confirmation)
                </button>
              )}

              {ticket.status === 'Resolved' && (
                <span style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                  Ticket marked Resolved. Awaiting employee confirmation to close or reopen.
                </span>
              )}

              {ticket.status === 'Closed' && (
                <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  This ticket is officially closed by the employee.
                </span>
              )}
            </div>
          )}

          {/* ADMIN WORKFLOW ACTIONS */}
          {currentUser.role === 'admin' && (
            <div className="staff-workflow-row">
              <span className="workflow-label">Admin Status Override:</span>
              <select
                className="filter-select"
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TICKET CONVERSATION & COMMENTS SECTION */}
      <div className="comments-section-card">
        <div className="comments-section-header">
          <div className="comments-title">
            <MessageSquare size={18} color="#2563eb" /> Activity History &amp; Conversation
            <span className="comments-count">
              ({comments.length} {comments.length === 1 ? 'entry' : 'entries'})
            </span>
          </div>

          {isStaffOrAdmin && (
            <div className="internal-notes-notice">
              <Lock size={12} /> Staff internal notes are enabled &amp; hidden from employees.
            </div>
          )}
        </div>

        {/* Comment Thread List */}
        <div className="comments-thread">
          {comments.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No messages posted yet.
            </div>
          ) : (
            comments.map((c) => {
              if (c.type === 'system') {
                return (
                  <div key={c.id} className="comment-item-system">
                    <span>{c.message}</span> • <span style={{ fontSize: '0.75rem' }}>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              }

              const isInternalNote = c.type === 'internal';

              return (
                <div
                  key={c.id}
                  className={`comment-item ${isInternalNote ? 'comment-item-internal' : ''}`}
                >
                  <div className="comment-header">
                    <div className="comment-author-info">
                      {c.userRole === 'admin' ? (
                        <Shield size={14} color="#db2777" />
                      ) : c.userRole === 'support' ? (
                        <Headphones size={14} color="#d97706" />
                      ) : (
                        <UserIcon size={14} color="#0284c7" />
                      )}
                      <span className="comment-author-name">{c.userName}</span>
                      <span
                        className={`role-tag role-tag-${c.userRole}`}
                      >
                        {c.userRole}
                      </span>

                      {isInternalNote && (
                        <span className="internal-badge">
                          <Lock size={10} /> STAFF INTERNAL NOTE (HIDDEN FROM USER)
                        </span>
                      )}
                    </div>

                    <span className="comment-time">
                      {new Date(c.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="comment-body">{c.message}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Reply Form */}
        <form onSubmit={handleAddComment} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>Add Reply or Note</span>
              {isStaffOrAdmin && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#b45309', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <Lock size={12} /> Post as Private Internal Note (Visible only to Support/Admin)
                </label>
              )}
            </label>

            <textarea
              className="form-textarea"
              style={{
                borderColor: isInternal ? '#f59e0b' : 'var(--color-border)',
                backgroundColor: isInternal ? '#fffdf7' : '#ffffff',
              }}
              rows={3}
              placeholder={
                isInternal
                  ? 'Write internal troubleshooting notes, hardware serials, root cause (visible ONLY to staff)...'
                  : 'Type your message to communicate with the user or support technician...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              type="submit"
              disabled={submittingComment || !message.trim()}
              className={`btn ${isInternal ? 'btn-warning' : 'btn-primary'}`}
            >
              <Send size={14} />
              {submittingComment
                ? 'Posting...'
                : isInternal
                ? 'Submit Internal Note'
                : 'Post Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
