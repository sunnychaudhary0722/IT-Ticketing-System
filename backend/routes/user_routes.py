import datetime
import re
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import users_col, persist_to_disk
from auth import token_required, role_required, hash_password

user_bp = Blueprint('users', __name__, url_prefix='/api/users')

def format_user(u):
    return {
        'id': str(u['_id']),
        'name': u.get('name', ''),
        'email': u.get('email', ''),
        'role': u.get('role', 'user'),
        'status': u.get('status', 'active'),
        'department': u.get('department', ''),
        'specialty': u.get('specialty', ''),
        'createdAt': u.get('createdAt', '')
    }

@user_bp.route('', methods=['GET'])
@token_required
@role_required('admin', 'support')
def list_users():
    current_user = g.current_user
    role = current_user.get('role')
    
    role_filter = request.args.get('role', '').strip()
    search = request.args.get('search', '').strip()

    query = {}
    # Support staff can only view other support staff (for ticket reassignment)
    if role == 'support':
        query['role'] = {'$in': ['support', 'admin']}
    elif role_filter:
        query['role'] = role_filter

    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        query['$or'] = [
            {'name': {'$regex': regex}},
            {'email': {'$regex': regex}},
            {'department': {'$regex': regex}}
        ]

    users = users_col.find(query).sort('createdAt', -1)
    results = [format_user(u) for u in users]

    return jsonify({'users': results, 'count': len(results)}), 200

@user_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_user():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'user').strip().lower()
    department = data.get('department', '').strip()
    specialty = data.get('specialty', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and temporary password are required.'}), 400

    if role not in ['user', 'support', 'admin']:
        return jsonify({'error': 'Invalid role. Must be user, support, or admin.'}), 400

    existing = users_col.find_one({'email': email})
    if existing:
        return jsonify({'error': 'A user with this email address already exists.'}), 409

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_doc = {
        'name': name,
        'email': email,
        'password': hash_password(password),
        'role': role,
        'status': 'active',
        'department': department,
        'specialty': specialty,
        'createdAt': now
    }

    result = users_col.insert_one(new_doc)
    new_doc['_id'] = result.inserted_id
    persist_to_disk()

    return jsonify({
        'message': f"Account for '{name}' with role '{role}' created successfully.",
        'user': format_user(new_doc)
    }), 201

@user_bp.route('/<user_id>/status', methods=['PATCH'])
@token_required
@role_required('admin')
def toggle_user_status(user_id):
    current_user = g.current_user
    if str(current_user['_id']) == user_id:
        return jsonify({'error': 'You cannot deactivate your own administrative account.'}), 400

    try:
        query_id = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user ID format.'}), 400

    target = users_col.find_one({'_id': query_id})
    if not target:
        return jsonify({'error': 'User not found.'}), 404

    current_status = target.get('status', 'active')
    new_status = 'disabled' if current_status == 'active' else 'active'

    users_col.update_one({'_id': query_id}, {'$set': {'status': new_status}})
    persist_to_disk()

    return jsonify({
        'message': f"User account has been {new_status}.",
        'user': format_user(users_col.find_one({'_id': query_id}))
    }), 200

@user_bp.route('/<user_id>/role', methods=['PATCH'])
@token_required
@role_required('admin')
def change_user_role(user_id):
    current_user = g.current_user
    if str(current_user['_id']) == user_id:
        return jsonify({'error': 'You cannot modify your own administrative role.'}), 400

    data = request.get_json() or {}
    new_role = data.get('role', '').strip().lower()

    if new_role not in ['user', 'support', 'admin']:
        return jsonify({'error': 'Role must be user, support, or admin.'}), 400

    try:
        query_id = ObjectId(user_id)
    except Exception:
        return jsonify({'error': 'Invalid user ID format.'}), 400

    target = users_col.find_one({'_id': query_id})
    if not target:
        return jsonify({'error': 'User not found.'}), 404

    users_col.update_one({'_id': query_id}, {'$set': {'role': new_role}})
    persist_to_disk()

    return jsonify({
        'message': f"User role updated to '{new_role}'.",
        'user': format_user(users_col.find_one({'_id': query_id}))
    }), 200
