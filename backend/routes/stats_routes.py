from flask import Blueprint, jsonify, g
from database import users_col, tickets_col
from auth import token_required

stats_bp = Blueprint('stats', __name__, url_prefix='/api/dashboard')

@stats_bp.route('/stats', methods=['GET'])
@token_required
def get_dashboard_stats():
    current_user = g.current_user
    role = current_user.get('role')
    user_id_str = str(current_user['_id'])

    if role == 'user':
        user_tickets_filter = {'createdBy.id': user_id_str}
        total = tickets_col.count_documents(user_tickets_filter)
        open_count = tickets_col.count_documents({**user_tickets_filter, 'status': 'Open'})
        in_progress = tickets_col.count_documents({**user_tickets_filter, 'status': 'In Progress'})
        resolved = tickets_col.count_documents({**user_tickets_filter, 'status': 'Resolved'})
        closed = tickets_col.count_documents({**user_tickets_filter, 'status': 'Closed'})

        return jsonify({
            'role': 'user',
            'stats': {
                'totalTickets': total,
                'openTickets': open_count,
                'inProgressTickets': in_progress,
                'resolvedTickets': resolved,
                'closedTickets': closed
            }
        }), 200

    elif role == 'support':
        total = tickets_col.count_documents({})
        unassigned = tickets_col.count_documents({'assignedTo': None})
        my_tickets = tickets_col.count_documents({'assignedTo.id': user_id_str})
        open_count = tickets_col.count_documents({'status': 'Open'})
        in_progress = tickets_col.count_documents({'status': 'In Progress'})
        resolved = tickets_col.count_documents({'status': 'Resolved'})
        closed = tickets_col.count_documents({'status': 'Closed'})

        return jsonify({
            'role': 'support',
            'stats': {
                'totalTickets': total,
                'unassignedTickets': unassigned,
                'myTickets': my_tickets,
                'openTickets': open_count,
                'inProgressTickets': in_progress,
                'resolvedTickets': resolved,
                'closedTickets': closed
            }
        }), 200

    else: # admin
        total_users = users_col.count_documents({})
        support_staff_count = users_col.count_documents({'role': 'support'})
        total_tickets = tickets_col.count_documents({})
        open_count = tickets_col.count_documents({'status': 'Open'})
        in_progress = tickets_col.count_documents({'status': 'In Progress'})
        resolved = tickets_col.count_documents({'status': 'Resolved'})
        closed = tickets_col.count_documents({'status': 'Closed'})
        unassigned = tickets_col.count_documents({'assignedTo': None})

        return jsonify({
            'role': 'admin',
            'stats': {
                'totalUsers': total_users,
                'supportStaffCount': support_staff_count,
                'totalTickets': total_tickets,
                'openTickets': open_count,
                'inProgressTickets': in_progress,
                'resolvedTickets': resolved,
                'closedTickets': closed,
                'unassignedTickets': unassigned
            }
        }), 200
