import datetime
import re
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import tickets_col, comments_col, users_col, persist_to_disk
from auth import token_required, role_required

ticket_bp = Blueprint('tickets', __name__, url_prefix='/api/tickets')

VALID_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Security', 'Other']
VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

def format_ticket(t):
    return {
        'id': str(t['_id']),
        'ticketId': t.get('ticketId', f"TICK-{str(t['_id'])[-4:].upper()}"),
        'title': t.get('title', ''),
        'description': t.get('description', ''),
        'category': t.get('category', 'Other'),
        'priority': t.get('priority', 'Medium'),
        'status': t.get('status', 'Open'),
        'createdBy': t.get('createdBy', {}),
        'assignedTo': t.get('assignedTo'),
        'createdAt': t.get('createdAt', ''),
        'updatedAt': t.get('updatedAt', '')
    }

@ticket_bp.route('', methods=['GET'])
@token_required
def list_tickets():
    current_user = g.current_user
    role = current_user.get('role')
    user_id_str = str(current_user['_id'])

    # Query parameters
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()
    priority = request.args.get('priority', '').strip()
    category = request.args.get('category', '').strip()
    filter_type = request.args.get('filter', 'all').strip() # 'all', 'my', 'unassigned'

    query = {}

    # Strict Role Isolation: Normal users can strictly ONLY see their own tickets
    if role == 'user':
        query['createdBy.id'] = user_id_str
    elif role == 'support':
        if filter_type == 'my':
            query['assignedTo.id'] = user_id_str
        elif filter_type == 'unassigned':
            query['assignedTo'] = None
    elif role == 'admin':
        if filter_type == 'my':
            query['assignedTo.id'] = user_id_str
        elif filter_type == 'unassigned':
            query['assignedTo'] = None

    # Status filter
    if status and status in VALID_STATUSES:
        query['status'] = status

    # Priority filter
    if priority and priority in VALID_PRIORITIES:
        query['priority'] = priority

    # Category filter
    if category and category in VALID_CATEGORIES:
        query['category'] = category

    # Search filter (matches ticketId, title, or description)
    if search:
        regex_pattern = re.compile(re.escape(search), re.IGNORECASE)
        query['$or'] = [
            {'title': {'$regex': regex_pattern}},
            {'description': {'$regex': regex_pattern}},
            {'ticketId': {'$regex': regex_pattern}}
        ]

    # Fetch and sort by updated date descending
    tickets_cursor = tickets_col.find(query).sort('updatedAt', -1)
    results = [format_ticket(t) for t in tickets_cursor]

    return jsonify({
        'tickets': results,
        'count': len(results)
    }), 200

@ticket_bp.route('', methods=['POST'])
@token_required
def create_ticket():
    current_user = g.current_user
    role = current_user.get('role')

    # Strict constraint: Admin and support team cannot create ticket. User can only create ticket.
    if role != 'user':
        return jsonify({
            'error': 'Only employee users can create tickets. Support team members and administrators cannot create tickets.'
        }), 403

    data = request.get_json() or {}

    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', 'Other').strip()
    priority = data.get('priority', 'Medium').strip()

    if not title or not description:
        return jsonify({'error': 'Title and description are required.'}), 400

    if category not in VALID_CATEGORIES:
        category = 'Other'
    if priority not in VALID_PRIORITIES:
        priority = 'Medium'

    # Generate sequential or readable ticket code
    ticket_count = tickets_col.count_documents({}) + 1
    generated_ticket_id = f"TICK-{1000 + ticket_count}"

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_ticket = {
        'ticketId': generated_ticket_id,
        'title': title,
        'description': description,
        'category': category,
        'priority': priority,
        'status': 'Open',
        'createdBy': {
            'id': str(current_user['_id']),
            'name': current_user.get('name', 'Anonymous User'),
            'email': current_user.get('email', ''),
            'department': current_user.get('department', '')
        },
        'assignedTo': None,
        'createdAt': now,
        'updatedAt': now
    }

    result = tickets_col.insert_one(new_ticket)
    new_ticket['_id'] = result.inserted_id

    # Create initial system event comment
    comments_col.insert_one({
        'ticketId': str(result.inserted_id),
        'userId': str(current_user['_id']),
        'userName': 'System',
        'userRole': 'system',
        'message': f"Ticket was created by {current_user.get('name')} with priority '{priority}' and status 'Open'.",
        'type': 'system',
        'createdAt': now
    })

    persist_to_disk()

    return jsonify({
        'message': 'Support ticket created successfully.',
        'ticket': format_ticket(new_ticket)
    }), 201

@ticket_bp.route('/<ticket_id>', methods=['GET'])
@token_required
def get_ticket_details(ticket_id):
    current_user = g.current_user
    role = current_user.get('role')
    user_id_str = str(current_user['_id'])

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    # Security check: User cannot view someone else's ticket
    if role == 'user' and ticket.get('createdBy', {}).get('id') != user_id_str:
        return jsonify({'error': 'Access denied. You can only view your own tickets.'}), 403

    # Load comments
    # Normal users MUST NOT see internal notes!
    comment_query = {'ticketId': ticket_id}
    if role == 'user':
        comment_query['type'] = {'$ne': 'internal'}

    comments_cursor = comments_col.find(comment_query).sort('createdAt', 1)
    comments = []
    for c in comments_cursor:
        comments.append({
            'id': str(c['_id']),
            'ticketId': c.get('ticketId'),
            'userId': c.get('userId'),
            'userName': c.get('userName', 'Unknown'),
            'userRole': c.get('userRole', 'user'),
            'message': c.get('message', ''),
            'type': c.get('type', 'comment'),
            'createdAt': c.get('createdAt', '')
        })

    return jsonify({
        'ticket': format_ticket(ticket),
        'comments': comments
    }), 200

@ticket_bp.route('/<ticket_id>/status', methods=['PATCH'])
@token_required
def update_ticket_status(ticket_id):
    current_user = g.current_user
    role = current_user.get('role')
    user_id_str = str(current_user['_id'])
    data = request.get_json() or {}
    new_status = data.get('status', '').strip()

    if new_status not in VALID_STATUSES:
        return jsonify({'error': f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"}), 400

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    old_status = ticket.get('status', 'Open')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Role-based status transition rules:
    # 1. USER: Can ONLY reopen (Resolved -> In Progress) or close (Resolved -> Closed)
    if role == 'user':
        if ticket.get('createdBy', {}).get('id') != user_id_str:
            return jsonify({'error': 'You can only update your own tickets.'}), 403
        
        if old_status != 'Resolved':
            return jsonify({'error': 'Users can only reopen or close tickets that are currently marked as Resolved.'}), 403

        if new_status == 'Closed':
            msg = f"{current_user.get('name')} confirmed the resolution and closed the ticket."
        elif new_status == 'In Progress':
            reason = data.get('reason', 'User reported the issue is not fixed.')
            msg = f"{current_user.get('name')} reopened the ticket: \"{reason}\""
        else:
            return jsonify({'error': 'Users can only transition a Resolved ticket to Closed or In Progress.'}), 403

    # 2. SUPPORT STAFF: Can transition tickets through the support workflow
    elif role == 'support':
        if new_status == 'Closed':
            return jsonify({'error': 'Support staff should mark tickets as Resolved; the user confirms and Closes the ticket.'}), 403
        msg = f"Status updated from '{old_status}' to '{new_status}' by {current_user.get('name')} (Support)."

    # 3. ADMIN: Unrestricted authority
    else:
        msg = f"Status updated from '{old_status}' to '{new_status}' by {current_user.get('name')} (Admin)."

    tickets_col.update_one(
        {'_id': query_id},
        {'$set': {'status': new_status, 'updatedAt': now}}
    )

    # Add audit comment
    comments_col.insert_one({
        'ticketId': ticket_id,
        'userId': user_id_str,
        'userName': current_user.get('name'),
        'userRole': role,
        'message': msg,
        'type': 'system',
        'createdAt': now
    })

    persist_to_disk()

    updated_ticket = tickets_col.find_one({'_id': query_id})
    return jsonify({
        'message': f"Ticket status changed to '{new_status}'.",
        'ticket': format_ticket(updated_ticket)
    }), 200

@ticket_bp.route('/<ticket_id>/claim', methods=['PATCH'])
@token_required
@role_required('admin')
def claim_ticket(ticket_id):
    current_user = g.current_user
    user_id_str = str(current_user['_id'])

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    assigned_obj = {
        'id': user_id_str,
        'name': current_user.get('name'),
        'email': current_user.get('email')
    }

    # Setting status to 'In Progress' if currently 'Open'
    new_status = 'In Progress' if ticket.get('status') == 'Open' else ticket.get('status')

    tickets_col.update_one(
        {'_id': query_id},
        {'$set': {
            'assignedTo': assigned_obj,
            'status': new_status,
            'updatedAt': now
        }}
    )

    # Audit comment
    comments_col.insert_one({
        'ticketId': ticket_id,
        'userId': user_id_str,
        'userName': current_user.get('name'),
        'userRole': current_user.get('role'),
        'message': f"Ticket assigned by Administrator {current_user.get('name')}. Status is now '{new_status}'.",
        'type': 'system',
        'createdAt': now
    })

    persist_to_disk()

    updated_ticket = tickets_col.find_one({'_id': query_id})
    return jsonify({
        'message': f"Ticket successfully assigned by {current_user.get('name')}.",
        'ticket': format_ticket(updated_ticket)
    }), 200

@ticket_bp.route('/<ticket_id>/assign', methods=['PATCH'])
@token_required
@role_required('admin')
def assign_ticket(ticket_id):
    current_user = g.current_user
    data = request.get_json() or {}
    assignee_id = data.get('assignedToId') # can be None to unassign

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not assignee_id:
        assigned_obj = None
        msg = f"Ticket was unassigned by Administrator {current_user.get('name')}."
    else:
        try:
            target_user = users_col.find_one({'_id': ObjectId(assignee_id)})
        except Exception:
            return jsonify({'error': 'Invalid assignee ID format.'}), 400

        if not target_user:
            return jsonify({'error': 'Selected staff member not found.'}), 404

        if target_user.get('role') not in ['support', 'admin']:
            return jsonify({'error': 'Tickets can only be assigned to Support Staff or Admins.'}), 400

        assigned_obj = {
            'id': str(target_user['_id']),
            'name': target_user.get('name'),
            'email': target_user.get('email')
        }
        msg = f"Ticket assigned to {target_user.get('name')} by Administrator {current_user.get('name')}."

    tickets_col.update_one(
        {'_id': query_id},
        {'$set': {'assignedTo': assigned_obj, 'updatedAt': now}}
    )

    comments_col.insert_one({
        'ticketId': ticket_id,
        'userId': str(current_user['_id']),
        'userName': current_user.get('name'),
        'userRole': current_user.get('role'),
        'message': msg,
        'type': 'system',
        'createdAt': now
    })

    persist_to_disk()

    updated_ticket = tickets_col.find_one({'_id': query_id})
    return jsonify({
        'message': msg,
        'ticket': format_ticket(updated_ticket)
    }), 200

@ticket_bp.route('/<ticket_id>/priority', methods=['PATCH'])
@token_required
@role_required('support', 'admin')
def change_priority(ticket_id):
    current_user = g.current_user
    data = request.get_json() or {}
    new_priority = data.get('priority', '').strip()

    if new_priority not in VALID_PRIORITIES:
        return jsonify({'error': f"Invalid priority. Choose from: {', '.join(VALID_PRIORITIES)}"}), 400

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    old_priority = ticket.get('priority', 'Medium')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    tickets_col.update_one(
        {'_id': query_id},
        {'$set': {'priority': new_priority, 'updatedAt': now}}
    )

    comments_col.insert_one({
        'ticketId': ticket_id,
        'userId': str(current_user['_id']),
        'userName': current_user.get('name'),
        'userRole': current_user.get('role'),
        'message': f"Priority changed from '{old_priority}' to '{new_priority}' by {current_user.get('name')}.",
        'type': 'system',
        'createdAt': now
    })

    persist_to_disk()

    updated_ticket = tickets_col.find_one({'_id': query_id})
    return jsonify({
        'message': f"Priority updated to '{new_priority}'.",
        'ticket': format_ticket(updated_ticket)
    }), 200

@ticket_bp.route('/<ticket_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_ticket(ticket_id):
    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    tickets_col.delete_one({'_id': query_id})
    comments_col.delete_many({'ticketId': ticket_id})
    persist_to_disk()

    return jsonify({
        'message': f"Ticket {ticket.get('ticketId')} and its comment history have been deleted."
    }), 200
