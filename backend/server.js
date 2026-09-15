import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data_store.json');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-it-helpdesk-system-2026';
const JWT_EXPIRATION = '24h';

// Helper to generate unique string ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// In-memory data store with JSON file persistence
let store = {
  users: [],
  tickets: [],
  comments: [],
};

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      store.users = parsed.users || [];
      store.tickets = parsed.tickets || [];
      store.comments = parsed.comments || [];
    }
  } catch (err) {
    console.error('[DataStore] Error reading data_store.json:', err);
  }

  // Ensure file exists without inserting demo accounts
  if (!fs.existsSync(DATA_FILE)) {
    saveStore();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DataStore] Error saving to data_store.json:', err);
  }
}

// Initial store load
loadStore();

// Format helpers matching the REST API expectations
function formatSafeUser(u) {
  return {
    id: u.id || u._id,
    name: u.name || '',
    email: u.email || '',
    role: u.role || 'user',
    status: u.status || 'active',
    department: u.department || '',
    specialty: u.specialty || '',
    createdAt: u.createdAt || '',
  };
}

function formatTicket(t) {
  return {
    id: t.id || t._id,
    ticketId: t.ticketId || `TICK-${(t.id || t._id).slice(-4).toUpperCase()}`,
    title: t.title || '',
    description: t.description || '',
    category: t.category || 'Other',
    priority: t.priority || 'Medium',
    status: t.status || 'Open',
    createdBy: t.createdBy || {},
    assignedTo: t.assignedTo || null,
    createdAt: t.createdAt || '',
    updatedAt: t.updatedAt || '',
  };
}

// Create Express router / app
export const apiApp = express();

apiApp.use(express.json());

// CORS headers for all /api endpoints
apiApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Authentication middleware
function tokenRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization token is missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: "Invalid Authorization header format. Use 'Bearer <token>'" });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = store.users.find((u) => (u.id || u._id) === payload.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an IT Administrator.' });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function roleRequired(...allowedRoles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const role = req.currentUser.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(', ')}. Your role: ${role}`,
      });
    }
    next();
  };
}

function generateToken(user) {
  const userId = user.id || user._id;
  return jwt.sign(
    {
      user_id: userId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

// ==========================================
// 1. HEALTH CHECK
// ==========================================
apiApp.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'IT Help Desk & Ticketing System REST API',
    version: '1.0.0',
    stack: {
      backend: 'Node.js Express',
      auth: 'JWT (HMAC-SHA256) & bcrypt',
      database: 'JSON File Persistence Store',
    },
  });
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================
apiApp.post('/api/auth/register', (req, res) => {
  const { name, email, password, department = 'General', role = 'user' } = req.body || {};
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanRole = (role || 'user').trim().toLowerCase();
  const cleanDept = (department || 'General').trim();

  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required fields.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Support staff accounts cannot be self-registered
  if (cleanRole === 'support') {
    return res.status(403).json({
      error: 'Support team accounts cannot be self-registered. Support accounts can only be created by an Administrator.',
    });
  }

  const assignedRole = cleanRole === 'admin' ? 'admin' : 'user';

  const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const newId = generateId();
  const now = new Date().toISOString();

  const newUser = {
    _id: newId,
    id: newId,
    name: cleanName,
    email: cleanEmail,
    password: bcrypt.hashSync(password, 10),
    role: assignedRole,
    status: 'active',
    department: cleanDept,
    createdAt: now,
  };

  store.users.push(newUser);
  saveStore();

  const token = generateToken(newUser);
  res.status(201).json({
    message: 'Account successfully registered.',
    token,
    user: formatSafeUser(newUser),
  });
});

apiApp.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact an IT Administrator.' });
  }

  const token = generateToken(user);
  res.json({
    message: 'Login successful.',
    token,
    user: formatSafeUser(user),
  });
});

apiApp.get('/api/auth/me', tokenRequired, (req, res) => {
  res.json({ user: formatSafeUser(req.currentUser) });
});

// ==========================================
// 3. DASHBOARD STATS ROUTE
// ==========================================
apiApp.get('/api/dashboard/stats', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const role = user.role;
  const userId = user.id || user._id;

  if (role === 'user') {
    const userTickets = store.tickets.filter((t) => t.createdBy?.id === userId);
    res.json({
      role: 'user',
      stats: {
        totalTickets: userTickets.length,
        openTickets: userTickets.filter((t) => t.status === 'Open').length,
        inProgressTickets: userTickets.filter((t) => t.status === 'In Progress').length,
        resolvedTickets: userTickets.filter((t) => t.status === 'Resolved').length,
        closedTickets: userTickets.filter((t) => t.status === 'Closed').length,
      },
    });
  } else if (role === 'support') {
    res.json({
      role: 'support',
      stats: {
        totalTickets: store.tickets.length,
        unassignedTickets: store.tickets.filter((t) => !t.assignedTo).length,
        myTickets: store.tickets.filter((t) => t.assignedTo?.id === userId).length,
        openTickets: store.tickets.filter((t) => t.status === 'Open').length,
        inProgressTickets: store.tickets.filter((t) => t.status === 'In Progress').length,
        resolvedTickets: store.tickets.filter((t) => t.status === 'Resolved').length,
        closedTickets: store.tickets.filter((t) => t.status === 'Closed').length,
      },
    });
  } else {
    // admin
    res.json({
      role: 'admin',
      stats: {
        totalUsers: store.users.length,
        supportStaffCount: store.users.filter((u) => u.role === 'support').length,
        totalTickets: store.tickets.length,
        openTickets: store.tickets.filter((t) => t.status === 'Open').length,
        inProgressTickets: store.tickets.filter((t) => t.status === 'In Progress').length,
        resolvedTickets: store.tickets.filter((t) => t.status === 'Resolved').length,
        closedTickets: store.tickets.filter((t) => t.status === 'Closed').length,
        unassignedTickets: store.tickets.filter((t) => !t.assignedTo).length,
      },
    });
  }
});

// ==========================================
// 4. TICKETS ROUTES
// ==========================================
const VALID_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Security', 'Other'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

apiApp.get('/api/tickets', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const role = user.role;
  const userId = user.id || user._id;

  const search = (req.query.search || '').trim().toLowerCase();
  const status = (req.query.status || '').trim();
  const priority = (req.query.priority || '').trim();
  const category = (req.query.category || '').trim();
  const filterType = (req.query.filter || 'all').trim();

  let filtered = [...store.tickets];

  // Role-based visibility
  if (role === 'user') {
    filtered = filtered.filter((t) => t.createdBy?.id === userId);
  } else if (role === 'support' || role === 'admin') {
    if (filterType === 'my') {
      filtered = filtered.filter((t) => t.assignedTo?.id === userId);
    } else if (filterType === 'unassigned') {
      filtered = filtered.filter((t) => !t.assignedTo);
    }
  }

  // Filters
  if (status && VALID_STATUSES.includes(status)) {
    filtered = filtered.filter((t) => t.status === status);
  }
  if (priority && VALID_PRIORITIES.includes(priority)) {
    filtered = filtered.filter((t) => t.priority === priority);
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        (t.ticketId && t.ticketId.toLowerCase().includes(search))
    );
  }

  // Sort by updatedAt descending
  filtered.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  res.json({
    tickets: filtered.map(formatTicket),
    count: filtered.length,
  });
});

apiApp.post('/api/tickets', tokenRequired, (req, res) => {
  const user = req.currentUser;
  if (user.role !== 'user') {
    return res.status(403).json({
      error: 'Only employee users can create tickets. Support team members and administrators cannot create tickets.',
    });
  }

  const { title, description, category = 'Other', priority = 'Medium' } = req.body || {};
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();

  if (!cleanTitle || !cleanDesc) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'Other';
  const safePriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';

  const ticketCount = store.tickets.length + 1;
  const ticketId = `TICK-${1000 + ticketCount}`;
  const id = generateId();
  const now = new Date().toISOString();

  const newTicket = {
    _id: id,
    id,
    ticketId,
    title: cleanTitle,
    description: cleanDesc,
    category: safeCategory,
    priority: safePriority,
    status: 'Open',
    createdBy: {
      id: user.id || user._id,
      name: user.name || 'Anonymous User',
      email: user.email || '',
      department: user.department || '',
    },
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  };

  store.tickets.unshift(newTicket);

  // Add initial system comment
  store.comments.push({
    _id: generateId(),
    id: generateId(),
    ticketId: id,
    userId: user.id || user._id,
    userName: 'System',
    userRole: 'system',
    message: `Ticket was created by ${user.name} with priority '${safePriority}' and status 'Open'.`,
    type: 'system',
    createdAt: now,
  });

  saveStore();

  res.status(201).json({
    message: 'Support ticket created successfully.',
    ticket: formatTicket(newTicket),
  });
});

apiApp.get('/api/tickets/:id', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const userId = user.id || user._id;
  const ticketId = req.params.id;

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (user.role === 'user' && ticket.createdBy?.id !== userId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own tickets.' });
  }

  // Comments for this ticket
  let ticketComments = store.comments.filter((c) => c.ticketId === ticketId);

  // Hide internal notes from standard users
  if (user.role === 'user') {
    ticketComments = ticketComments.filter((c) => c.type !== 'internal');
  }

  ticketComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    ticket: formatTicket(ticket),
    comments: ticketComments.map((c) => ({
      id: c.id || c._id,
      ticketId: c.ticketId,
      userId: c.userId,
      userName: c.userName || 'Unknown',
      userRole: c.userRole || 'user',
      message: c.message || '',
      type: c.type || 'comment',
      createdAt: c.createdAt,
    })),
  });
});

apiApp.patch('/api/tickets/:id/status', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const role = user.role;
  const userId = user.id || user._id;
  const ticketId = req.params.id;
  const { status: newStatus, reason } = req.body || {};

  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const oldStatus = ticket.status;
  const now = new Date().toISOString();
  let msg = '';

  if (role === 'user') {
    if (ticket.createdBy?.id !== userId) {
      return res.status(403).json({ error: 'You can only update your own tickets.' });
    }
    if (oldStatus !== 'Resolved') {
      return res.status(403).json({ error: 'Users can only reopen or close tickets that are currently marked as Resolved.' });
    }

    if (newStatus === 'Closed') {
      msg = `${user.name} confirmed the resolution and closed the ticket.`;
    } else if (newStatus === 'In Progress') {
      const userReason = reason || 'User reported the issue is not fixed.';
      msg = `${user.name} reopened the ticket: "${userReason}"`;
    } else {
      return res.status(403).json({ error: 'Users can only transition a Resolved ticket to Closed or In Progress.' });
    }
  } else if (role === 'support') {
    if (newStatus === 'Closed') {
      return res.status(403).json({ error: 'Support staff should mark tickets as Resolved; the user confirms and Closes the ticket.' });
    }
    msg = `Status updated from '${oldStatus}' to '${newStatus}' by ${user.name} (Support).`;
  } else {
    msg = `Status updated from '${oldStatus}' to '${newStatus}' by ${user.name} (Admin).`;
  }

  ticket.status = newStatus;
  ticket.updatedAt = now;

  store.comments.push({
    _id: generateId(),
    id: generateId(),
    ticketId,
    userId,
    userName: user.name,
    userRole: role,
    message: msg,
    type: 'system',
    createdAt: now,
  });

  saveStore();

  res.json({
    message: `Ticket status changed to '${newStatus}'.`,
    ticket: formatTicket(ticket),
  });
});

apiApp.patch('/api/tickets/:id/claim', tokenRequired, roleRequired('support', 'admin'), (req, res) => {
  const user = req.currentUser;
  const userId = user.id || user._id;
  const ticketId = req.params.id;

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const now = new Date().toISOString();
  const assignedObj = {
    id: userId,
    name: user.name,
    email: user.email,
  };

  const newStatus = ticket.status === 'Open' ? 'In Progress' : ticket.status;
  ticket.assignedTo = assignedObj;
  ticket.status = newStatus;
  ticket.updatedAt = now;

  store.comments.push({
    _id: generateId(),
    id: generateId(),
    ticketId,
    userId,
    userName: user.name,
    userRole: user.role,
    message: `Ticket claimed by ${user.name} (${user.role}). Status is now '${newStatus}'.`,
    type: 'system',
    createdAt: now,
  });

  saveStore();

  res.json({
    message: `Ticket successfully claimed by ${user.name}.`,
    ticket: formatTicket(ticket),
  });
});

apiApp.patch('/api/tickets/:id/assign', tokenRequired, roleRequired('admin'), (req, res) => {
  const adminUser = req.currentUser;
  const ticketId = req.params.id;
  const { assignedToId } = req.body || {};

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const now = new Date().toISOString();
  let msg = '';

  if (!assignedToId) {
    ticket.assignedTo = null;
    msg = `Ticket was unassigned by Administrator ${adminUser.name}.`;
  } else {
    const target = store.users.find((u) => (u.id || u._id) === assignedToId);
    if (!target) {
      return res.status(404).json({ error: 'Selected staff member not found.' });
    }

    if (!['support', 'admin'].includes(target.role)) {
      return res.status(400).json({ error: 'Tickets can only be assigned to Support Staff or Admins.' });
    }

    ticket.assignedTo = {
      id: target.id || target._id,
      name: target.name,
      email: target.email,
    };
    msg = `Ticket assigned to ${target.name} by Administrator ${adminUser.name}.`;
  }

  ticket.updatedAt = now;

  store.comments.push({
    _id: generateId(),
    id: generateId(),
    ticketId,
    userId: adminUser.id || adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    message: msg,
    type: 'system',
    createdAt: now,
  });

  saveStore();

  res.json({
    message: msg,
    ticket: formatTicket(ticket),
  });
});

apiApp.patch('/api/tickets/:id/priority', tokenRequired, roleRequired('support', 'admin'), (req, res) => {
  const user = req.currentUser;
  const ticketId = req.params.id;
  const { priority: newPriority } = req.body || {};

  if (!VALID_PRIORITIES.includes(newPriority)) {
    return res.status(400).json({ error: `Invalid priority. Choose from: ${VALID_PRIORITIES.join(', ')}` });
  }

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const oldPriority = ticket.priority || 'Medium';
  const now = new Date().toISOString();

  ticket.priority = newPriority;
  ticket.updatedAt = now;

  store.comments.push({
    _id: generateId(),
    id: generateId(),
    ticketId,
    userId: user.id || user._id,
    userName: user.name,
    userRole: user.role,
    message: `Priority changed from '${oldPriority}' to '${newPriority}' by ${user.name}.`,
    type: 'system',
    createdAt: now,
  });

  saveStore();

  res.json({
    message: `Priority updated to '${newPriority}'.`,
    ticket: formatTicket(ticket),
  });
});

apiApp.delete('/api/tickets/:id', tokenRequired, roleRequired('admin'), (req, res) => {
  const ticketId = req.params.id;
  const index = store.tickets.findIndex((t) => (t.id || t._id) === ticketId);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const ticket = store.tickets[index];
  store.tickets.splice(index, 1);
  store.comments = store.comments.filter((c) => c.ticketId !== ticketId);
  saveStore();

  res.json({
    message: `Ticket ${ticket.ticketId} and its comment history have been deleted.`,
  });
});

// ==========================================
// 5. COMMENTS & NOTES ROUTES
// ==========================================
apiApp.get('/api/tickets/:id/comments', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const userId = user.id || user._id;
  const ticketId = req.params.id;

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (user.role === 'user' && ticket.createdBy?.id !== userId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  let list = store.comments.filter((c) => c.ticketId === ticketId);
  if (user.role === 'user') {
    list = list.filter((c) => c.type !== 'internal');
  }

  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    comments: list.map((c) => ({
      id: c.id || c._id,
      ticketId: c.ticketId,
      userId: c.userId,
      userName: c.userName || 'Unknown',
      userRole: c.userRole || 'user',
      message: c.message || '',
      type: c.type || 'comment',
      createdAt: c.createdAt,
    })),
    count: list.length,
  });
});

apiApp.post('/api/tickets/:id/comments', tokenRequired, (req, res) => {
  const user = req.currentUser;
  const userId = user.id || user._id;
  const ticketId = req.params.id;
  const { message, type = 'comment' } = req.body || {};
  const cleanMsg = (message || '').trim();
  const cleanType = (type || 'comment').trim();

  if (!cleanMsg) {
    return res.status(400).json({ error: 'Comment message cannot be empty.' });
  }

  const ticket = store.tickets.find((t) => (t.id || t._id) === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (user.role === 'user' && ticket.createdBy?.id !== userId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (cleanType === 'internal' && user.role === 'user') {
    return res.status(403).json({ error: 'Normal users cannot post internal notes.' });
  }

  const safeType = cleanType === 'internal' ? 'internal' : 'comment';
  const now = new Date().toISOString();

  const newComment = {
    _id: generateId(),
    id: generateId(),
    ticketId,
    userId,
    userName: user.name || 'User',
    userRole: user.role || 'user',
    message: cleanMsg,
    type: safeType,
    createdAt: now,
  };

  store.comments.push(newComment);
  ticket.updatedAt = now;
  saveStore();

  res.status(201).json({
    message: safeType === 'internal' ? 'Internal note added.' : 'Reply posted.',
    comment: newComment,
  });
});

// ==========================================
// 6. USERS ADMINISTRATION ROUTES
// ==========================================
apiApp.get('/api/users', tokenRequired, roleRequired('support', 'admin'), (req, res) => {
  const user = req.currentUser;
  const role = user.role;
  const roleFilter = (req.query.role || '').trim();
  const search = (req.query.search || '').trim().toLowerCase();

  let list = [...store.users];

  if (role === 'support') {
    list = list.filter((u) => ['support', 'admin'].includes(u.role));
  } else if (roleFilter) {
    list = list.filter((u) => u.role === roleFilter);
  }

  if (search) {
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.department && u.department.toLowerCase().includes(search))
    );
  }

  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({
    users: list.map(formatSafeUser),
    count: list.length,
  });
});

apiApp.post('/api/users', tokenRequired, roleRequired('admin'), (req, res) => {
  const { name, email, password, role = 'user', department = '', specialty = '' } = req.body || {};
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanRole = (role || 'user').trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).json({ error: 'Name, email, and temporary password are required.' });
  }

  if (!['user', 'support', 'admin'].includes(cleanRole)) {
    return res.status(400).json({ error: 'Invalid role. Must be user, support, or admin.' });
  }

  const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email address already exists.' });
  }

  const newId = generateId();
  const now = new Date().toISOString();

  const newUser = {
    _id: newId,
    id: newId,
    name: cleanName,
    email: cleanEmail,
    password: bcrypt.hashSync(password, 10),
    role: cleanRole,
    status: 'active',
    department: (department || '').trim(),
    specialty: (specialty || '').trim(),
    createdAt: now,
  };

  store.users.push(newUser);
  saveStore();

  res.status(201).json({
    message: `Account for '${cleanName}' with role '${cleanRole}' created successfully.`,
    user: formatSafeUser(newUser),
  });
});

apiApp.patch('/api/users/:id/status', tokenRequired, roleRequired('admin'), (req, res) => {
  const currentUserId = req.currentUser.id || req.currentUser._id;
  const targetId = req.params.id;

  if (currentUserId === targetId) {
    return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
  }

  const target = store.users.find((u) => (u.id || u._id) === targetId);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  target.status = target.status === 'active' ? 'disabled' : 'active';
  saveStore();

  res.json({
    message: `User account has been ${target.status}.`,
    user: formatSafeUser(target),
  });
});

apiApp.patch('/api/users/:id/role', tokenRequired, roleRequired('admin'), (req, res) => {
  const currentUserId = req.currentUser.id || req.currentUser._id;
  const targetId = req.params.id;
  const { role: newRole } = req.body || {};
  const cleanRole = (newRole || '').trim().toLowerCase();

  if (currentUserId === targetId) {
    return res.status(400).json({ error: 'You cannot modify your own administrative role.' });
  }

  if (!['user', 'support', 'admin'].includes(cleanRole)) {
    return res.status(400).json({ error: 'Role must be user, support, or admin.' });
  }

  const target = store.users.find((u) => (u.id || u._id) === targetId);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  target.role = cleanRole;
  saveStore();

  res.json({
    message: `User role updated to '${cleanRole}'.`,
    user: formatSafeUser(target),
  });
});

// Standalone runner for testing or container execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5000;
  apiApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express API] Running on http://0.0.0.0:${PORT}`);
  });
}
