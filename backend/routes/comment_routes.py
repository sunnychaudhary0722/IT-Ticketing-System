import datetime
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import comments_col, tickets_col, persist_to_disk
from auth import token_required

comment_bp = Blueprint('comments', __name__, url_prefix='/api/tickets/<ticket_id>/comments')

@comment_bp.route('', methods=['GET'])
@token_required
def get_comments(ticket_id):
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

    # Security check: User cannot read comments on others' tickets
    if role == 'user' and ticket.get('createdBy', {}).get('id') != user_id_str:
        return jsonify({'error': 'Access denied.'}), 403

    query = {'ticketId': ticket_id}
    # Crucial business rule: Internal notes must NEVER be exposed to normal employees
    if role == 'user':
        query['type'] = {'$ne': 'internal'}

    comments_cursor = comments_col.find(query).sort('createdAt', 1)
    results = []
    for c in comments_cursor:
        results.append({
            'id': str(c['_id']),
            'ticketId': c.get('ticketId'),
            'userId': c.get('userId'),
            'userName': c.get('userName', 'Unknown'),
            'userRole': c.get('userRole', 'user'),
            'message': c.get('message', ''),
            'type': c.get('type', 'comment'), # 'comment', 'internal', 'system'
            'createdAt': c.get('createdAt', '')
        })

    return jsonify({'comments': results, 'count': len(results)}), 200

@comment_bp.route('', methods=['POST'])
@token_required
def add_comment(ticket_id):
    current_user = g.current_user
    role = current_user.get('role')
    user_id_str = str(current_user['_id'])
    data = request.get_json() or {}

    message = data.get('message', '').strip()
    comment_type = data.get('type', 'comment').strip() # 'comment' or 'internal'

    if not message:
        return jsonify({'error': 'Comment message cannot be empty.'}), 400

    try:
        query_id = ObjectId(ticket_id)
    except Exception:
        return jsonify({'error': 'Invalid ticket ID format.'}), 400

    ticket = tickets_col.find_one({'_id': query_id})
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    # Security check: User cannot post on someone else's ticket
    if role == 'user' and ticket.get('createdBy', {}).get('id') != user_id_str:
        return jsonify({'error': 'Access denied.'}), 403

    # Business rule: Internal notes can ONLY be authored by Support Staff or Admin
    if comment_type == 'internal' and role == 'user':
        return jsonify({'error': 'Normal users cannot post internal notes.'}), 403

    if comment_type not in ['comment', 'internal']:
        comment_type = 'comment'

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_comment = {
        'ticketId': ticket_id,
        'userId': user_id_str,
        'userName': current_user.get('name', 'User'),
        'userRole': role,
        'message': message,
        'type': comment_type,
        'createdAt': now
    }

    result = comments_col.insert_one(new_comment)
    new_comment['_id'] = result.inserted_id

    # Update ticket's updatedAt timestamp
    tickets_col.update_one({'_id': query_id}, {'$set': {'updatedAt': now}})
    persist_to_disk()

    return jsonify({
        'message': 'Comment posted successfully.',
        'comment': {
            'id': str(new_comment['_id']),
            'ticketId': new_comment['ticketId'],
            'userId': new_comment['userId'],
            'userName': new_comment['userName'],
            'userRole': new_comment['userRole'],
            'message': new_comment['message'],
            'type': new_comment['type'],
            'createdAt': new_comment['createdAt']
        }
    }), 201
