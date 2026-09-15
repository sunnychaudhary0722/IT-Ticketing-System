const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('helpdesk_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

// 1. Authentication
export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function apiRegister(
  name,
  email,
  password,
  department,
  role = 'user'
) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, department, role }),
  });
  return handleResponse(res);
}

export async function apiGetCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// 2. Dashboard Statistics
export async function apiGetDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// 3. Tickets
export async function apiGetTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.category) query.set('category', params.category);
  if (params.filter) query.set('filter', params.filter);

  const res = await fetch(`${API_BASE}/tickets?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function apiGetTicketDetails(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function apiCreateTicket(data) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiUpdateTicketStatus(ticketId, status, reason) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, reason }),
  });
  return handleResponse(res);
}

export async function apiClaimTicket(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/claim`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function apiAssignTicket(ticketId, assignedToId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ assignedToId }),
  });
  return handleResponse(res);
}

export async function apiChangePriority(ticketId, priority) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/priority`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ priority }),
  });
  return handleResponse(res);
}

export async function apiDeleteTicket(ticketId) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// 4. Comments & Internal Notes
export async function apiAddComment(ticketId, message, type = 'comment') {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, type }),
  });
  return handleResponse(res);
}

// 5. User Management (Admin / Support)
export async function apiGetUsers(role, search) {
  const query = new URLSearchParams();
  if (role) query.set('role', role);
  if (search) query.set('search', search);

  const res = await fetch(`${API_BASE}/users?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function apiCreateUser(data) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiToggleUserStatus(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function apiChangeUserRole(userId, role) {
  const res = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  return handleResponse(res);
}
