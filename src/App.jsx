import React, { useState, useEffect } from 'react';
import {
  apiGetCurrentUser,
  apiGetDashboardStats,
  apiGetTickets,
  apiDeleteTicket,
} from './api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { StatsCards } from './components/StatsCards';
import { TicketList } from './components/TicketList';
import { TicketDetail } from './components/TicketDetail';
import { NewTicketModal } from './components/NewTicketModal';
import { AdminUserManagement } from './components/AdminUserManagement';
import { Users, Ticket as TicketIcon } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Tickets & Stats state
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Admin Top-Level Tab ('tickets' or 'users')
  const [adminTab, setAdminTab] = useState('tickets');

  // Modals state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Load current user on mount
  useEffect(() => {
    const token = localStorage.getItem('helpdesk_token');
    if (token) {
      apiGetCurrentUser()
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('helpdesk_token');
          setCurrentUser(null);
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    } else {
      setLoadingInitial(false);
    }
  }, []);

  // Fetch Tickets & Stats when user or filter criteria changes
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        apiGetTickets({
          search,
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          filter: filterType,
        }),
        apiGetDashboardStats(),
      ]);

      setTickets(ticketsRes.tickets);
      setStats(statsRes.stats);
    } catch (err) {
      console.error('Failed to refresh tickets or stats:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, search, statusFilter, priorityFilter, categoryFilter, filterType]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setSelectedTicketId(null);
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setFilterType('all');
  };

  const handleLogout = () => {
    localStorage.removeItem('helpdesk_token');
    setCurrentUser(null);
    setSelectedTicketId(null);
  };

  // Delete Ticket (Admin Only)
  const handleDeleteTicket = async (ticketId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this ticket permanently?')) return;
    try {
      await apiDeleteTicket(ticketId);
      await fetchData();
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
    }
  };

  if (loadingInitial) {
    return (
      <div className="app-container">
        <Navbar
          user={null}
          onLogout={() => {}}
        />
        <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 600 }}>
            Connecting to Help Desk API...
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth View
  if (!currentUser) {
    return (
      <div className="app-container">
        <Navbar
          user={null}
          onLogout={() => {}}
        />
        <AuthModal
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {/* Admin Navigation Tabs (Tickets vs Users) */}
        {currentUser.role === 'admin' && !selectedTicketId && (
          <div className="tabs-bar" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`tab-btn ${adminTab === 'tickets' ? 'tab-btn-active' : ''}`}
              onClick={() => setAdminTab('tickets')}
            >
              <TicketIcon size={16} /> Tickets Queue &amp; Assignment
            </button>
            <button
              type="button"
              className={`tab-btn ${adminTab === 'users' ? 'tab-btn-active' : ''}`}
              onClick={() => setAdminTab('users')}
            >
              <Users size={16} /> User &amp; Support Team Administration
            </button>
          </div>
        )}

        {/* Selected Ticket Detail View */}
        {selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            currentUser={currentUser}
            onBack={() => setSelectedTicketId(null)}
            onTicketUpdated={fetchData}
          />
        ) : (
          <>
            {/* Admin Users View */}
            {currentUser.role === 'admin' && adminTab === 'users' ? (
              <AdminUserManagement />
            ) : (
              <>
                {/* Metrics Stats Banner */}
                <StatsCards
                  stats={stats}
                  role={currentUser.role}
                  currentFilterStatus={statusFilter}
                  onSelectStatusFilter={(status) => setStatusFilter(status)}
                  currentFilterType={filterType}
                  onSelectFilterType={(type) => setFilterType(type)}
                />

                {/* Ticket Queue List */}
                <TicketList
                  tickets={tickets}
                  userRole={currentUser.role}
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  priorityFilter={priorityFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  filterType={filterType}
                  onFilterTypeChange={setFilterType}
                  onSelectTicket={(ticket) => setSelectedTicketId(ticket.id)}
                  onOpenNewTicketModal={currentUser.role === 'user' ? () => setShowNewTicketModal(true) : undefined}
                  onDeleteTicket={currentUser.role === 'admin' ? handleDeleteTicket : undefined}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* New Ticket Modal: Only available for Users */}
      {currentUser.role === 'user' && (
        <NewTicketModal
          isOpen={showNewTicketModal}
          onClose={() => setShowNewTicketModal(false)}
          onTicketCreated={(newTicket) => {
            fetchData();
            setSelectedTicketId(newTicket.id);
          }}
        />
      )}
    </div>
  );
}
