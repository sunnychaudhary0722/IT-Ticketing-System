# IT Help Desk & Ticketing System (Full-Stack Portfolio Project)

A professional, full-stack IT Help Desk and Ticketing platform designed for an **Associate / Intern Full-Stack Software Developer** portfolio.

Built with **Python Flask** (Backend REST API), **MongoDB / PyMongo** (Database Collections), **JWT & bcrypt** (Authentication & Role-Based Access Control), and **React.js** (Frontend Single Page Application).

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│              Client Layer (React.js SPA)               │
│  - User Dashboard (Tickets, New Ticket Modal, Reopen)   │
│  - Support Dashboard (Unassigned, Claim, Internal Note)│
│  - Admin Dashboard (User Management, Full Control)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON (JWT Bearer Token)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Python Flask REST API Engine              │
│  - /api/auth       (Login, Register, JWT, bcrypt)      │
│  - /api/tickets    (CRUD, Claim, Reassign, Status)     │
│  - /api/comments   (Replies & Private Staff Notes)     │
│  - /api/users      (Admin User Management, Enable/Ban) │
│  - /api/dashboard  (Role-based metrics & analytics)    │
└───────────────────────────┬────────────────────────────┘
                            │ PyMongo Driver / BSON
                            ▼
┌────────────────────────────────────────────────────────┐
│                  MongoDB Database                      │
│  Collections:                                          │
│    1. `users`    (Credentials, Roles, Status)          │
│    2. `tickets`  (Tickets, Categories, Assignees)      │
│    3. `comments` (Public thread & Internal Staff Notes)│
└────────────────────────────────────────────────────────┘
```

---

## Three Distinct Roles & Workflows

### 1. User / Employee (`user`)
- **Login / Register**: Can self-register or sign in.
- **Create Tickets**: Title, Description, Category, Priority.
- **View Own Tickets**: Strict isolation: queries filter by `createdBy.id == current_user['_id']`. Cannot see any other employee's tickets.
- **Participate in Thread**: Can post messages/replies.
- **Internal Note Privacy**: Guaranteed at database query level—`type == "internal"` notes are filtered out and never transmitted to normal users.
- **Resolution Control**:
  - If a ticket is marked **Resolved**:
    - User clicks **"Confirm Resolution & Close"** -> Status transitions to **Closed**.
    - If issue persists, user clicks **"Reopen Ticket"** -> Status transitions back to **In Progress**.

### 2. Support Staff (`support`)
- **Triage & Claim**: Browse unassigned tickets pool and click **"Claim Ticket"** (assigns to self and moves status from Open -> In Progress).
- **Manage**: Filter tickets by Status, Priority, Category, or "My Assigned".
- **Internal Notes**: Can publish internal notes (`type: "internal"`) visible only to fellow Support Staff and Admins.
- **Resolve Tickets**: When work is completed, marks status as **Resolved**.

### 3. Administrator (`admin`)
- **Full Ticket Oversight**: View all tickets across all departments, reassign tickets, adjust priorities, or delete invalid tickets.
- **User Management**:
  - View all registered employees and IT technicians.
  - Create new Support Staff accounts.
  - Deactivate/Enable accounts (disabled users cannot authenticate).
  - Modify user roles (`user`, `support`, `admin`).
- **Comprehensive Analytics**: Monitor open queues, resolution rates, unassigned bottlenecks, and staff counts.

---

## Database Schema & Collections

### `users` Collection
```json
{
  "_id": ObjectId("65f1a0000000000000000001"),
  "name": "Alex Morgan",
  "email": "alex.morgan@company.com",
  "password": "$2b$10$hashed_with_bcrypt...",
  "role": "user",
  "status": "active",
  "department": "Engineering",
  "createdAt": "2026-09-04T10:00:00Z"
}
```

### `tickets` Collection
```json
{
  "_id": ObjectId("65f2b0000000000000000001"),
  "ticketId": "TICK-1001",
  "title": "Wi-Fi connection latency on 4th floor",
  "description": "Signal drops intermittently during conference calls.",
  "category": "Network",
  "priority": "High",
  "status": "In Progress",
  "createdBy": {
    "id": "65f1a0000000000000000001",
    "name": "Alex Morgan",
    "email": "alex.morgan@company.com"
  },
  "assignedTo": {
    "id": "65f1a0000000000000000003",
    "name": "Jordan Lee",
    "email": "jordan.support@company.com"
  },
  "createdAt": "2026-09-12T06:00:00Z",
  "updatedAt": "2026-09-14T08:00:00Z"
}
```

### `comments` Collection
```json
{
  "_id": ObjectId("65f3c0000000000000000001"),
  "ticketId": "65f2b0000000000000000001",
  "userId": "65f1a0000000000000000003",
  "userName": "Jordan Lee",
  "userRole": "support",
  "message": "INTERNAL NOTE: Migrating access point to 5GHz DFS channels.",
  "type": "internal",
  "createdAt": "2026-09-13T06:00:00Z"
}
```

---

## User Onboarding & Access Provisioning

- **Employee and Administrator Registration**: Register an account directly via the Register Account form. Select between Employee/User (to file and monitor tickets) or Administrator (to manage staff and oversee tickets).
- **Support Staff Provisioning**: To guarantee organizational security and strict role boundaries, support specialists cannot self-register; they are provisioned directly by an Administrator via the User & Support Team Administration dashboard.

---

## Technical Highlights

### 1. Why bcrypt for password hashing?
> "Plain passwords must never be stored. bcrypt incorporates a 10-round cryptographic work factor (salt) that makes brute-force attacks and pre-computed rainbow table attacks computationally infeasible."

### 2. How does JWT authentication work?
> "When a user logs in, Flask validates the password with bcrypt, then signs a JSON Web Token containing the user's ID and role with an HMAC-SHA256 secret. The client stores this in memory/localStorage and sends it in the `Authorization: Bearer <token>` header on subsequent requests. Our `@token_required` decorator extracts and verifies this token on every protected endpoint."

### 3. How is Role-Based Access Control (RBAC) enforced?
> "We implemented custom Python decorators: `@token_required` and `@role_required('admin', 'support')`. This guarantees defense-in-depth: authorization checks occur on the server side, ensuring users cannot bypass frontend controls by calling API endpoints directly."

### 4. How are Internal Notes protected?
> "Internal notes (`type: "internal"`) are filtered at the database query level when a user with `role: 'user'` fetches ticket comments (`{type: {'$ne': 'internal'}}`). Furthermore, when creating a comment, the API rejects any attempt by a normal user to submit an internal note with a `403 Forbidden` response."
