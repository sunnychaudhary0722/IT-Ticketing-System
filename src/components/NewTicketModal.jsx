import React, { useState } from 'react';
import { apiCreateTicket } from '../api';
import { X, Plus, AlertCircle } from 'lucide-react';

export const NewTicketModal = ({
  isOpen,
  onClose,
  onTicketCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiCreateTicket({
        title,
        category,
        priority,
        description,
      });
      onTicketCreated(res.ticket);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#2563eb" /> Create IT Support Ticket
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Subject / Issue Title *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Cannot connect to company VPN or Wi-Fi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Problem Category *</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Hardware">Hardware (Laptop, Monitor, Dock, Printer)</option>
                  <option value="Software">Software (OS, Office Suite, IDE, License)</option>
                  <option value="Network">Network (Wi-Fi, VPN, DNS, Firewall)</option>
                  <option value="Account">Account (Password Reset, SSO, Permissions)</option>
                  <option value="Security">Security (Phishing, Device Encryption, Antivirus)</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Impact / Priority *</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Low">Low - Minor inconvenience, work unaffected</option>
                  <option value="Medium">Medium - Normal issue, workaround exists</option>
                  <option value="High">High - Significant disruption to productivity</option>
                  <option value="Critical">Critical - Work halted / System entirely down</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description of Problem *</label>
              <textarea
                required
                className="form-textarea"
                rows={5}
                placeholder="Please describe what happened, error messages seen, steps to reproduce, and your device type or location..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim() || !description.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Support Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
