import datetime
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import users_col, persist_to_disk
from auth import hash_password, check_password, generate_token, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    department = data.get('department', 'General').strip()
    requested_role = data.get('role', 'user').strip().lower()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required fields.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    # User and Admin can register. Support team cannot be self-registered; only admin can create support accounts.
    if requested_role == 'support':
        return jsonify({
            'error': 'Support team accounts cannot be self-registered. Support accounts can only be created by an Administrator.'
        }), 403

    if requested_role not in ['user', 'admin']:
        requested_role = 'user'

    existing_user = users_col.find_one({'email': email})
    if existing_user:
        return jsonify({'error': 'An account with this email address already exists.'}), 409

    hashed_pw = hash_password(password)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_user = {
        'name': name,
        'email': email,
        'password': hashed_pw,
        'role': requested_role,
        'status': 'active',
        'department': department,
        'createdAt': now
    }

    result = users_col.insert_one(new_user)
    new_user['_id'] = result.inserted_id
    persist_to_disk()

    token = generate_token(new_user)

    safe_user = {
        'id': str(new_user['_id']),
        'name': new_user['name'],
        'email': new_user['email'],
        'role': new_user['role'],
        'status': new_user['status'],
        'department': new_user.get('department', 'General'),
        'createdAt': new_user['createdAt']
    }

    return jsonify({
        'message': 'Account successfully registered.',
        'token': token,
        'user': safe_user
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = users_col.find_one({'email': email})
    if not user or not check_password(password, user.get('password', '')):
        return jsonify({'error': 'Invalid email address or password.'}), 401

    if user.get('status') == 'disabled':
        return jsonify({'error': 'Your account has been deactivated. Please contact an IT Administrator.'}), 403

    token = generate_token(user)

    safe_user = {
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'status': user.get('status', 'active'),
        'department': user.get('department', ''),
        'specialty': user.get('specialty', ''),
        'createdAt': user.get('createdAt', '')
    }

    return jsonify({
        'message': 'Login successful.',
        'token': token,
        'user': safe_user
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    user = g.current_user
    safe_user = {
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'status': user.get('status', 'active'),
        'department': user.get('department', ''),
        'specialty': user.get('specialty', ''),
        'createdAt': user.get('createdAt', '')
    }
    return jsonify({'user': safe_user}), 200
