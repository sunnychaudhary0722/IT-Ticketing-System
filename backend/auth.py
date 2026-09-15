import os
import datetime
from functools import wraps
import jwt
import bcrypt
from flask import request, jsonify, g
from bson import ObjectId
from database import users_col

# JWT Secret Key (in production, loaded from environment variables)
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-jwt-key-for-it-helpdesk-system-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(plain_text_password: str) -> str:
    """Hashes a password with bcrypt and a salt"""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(plain_text_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(plain_text_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored bcrypt hash"""
    try:
        return bcrypt.checkpw(plain_text_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def generate_token(user: dict) -> str:
    """Generates a signed JWT token containing user identity and role"""
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token"""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def token_required(f):
    """
    Decorator for endpoints that require a valid JWT token.
    Extracts Bearer token from 'Authorization' header and stores user in flask.g.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token is missing"}), 401
        
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid Authorization header format. Use 'Bearer <token>'"}), 401
        
        token = parts[1]
        try:
            payload = decode_token(token)
            # Fetch fresh user info from database
            user = users_col.find_one({"_id": ObjectId(payload["user_id"])})
            if not user:
                return jsonify({"error": "User account no longer exists"}), 401
            
            if user.get("status") == "disabled":
                return jsonify({"error": "Your account has been deactivated. Please contact an administrator."}), 403
            
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": f"Authentication failure: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    """
    Decorator for endpoints restricted to specific roles:
    @role_required('admin') or @role_required('support', 'admin')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({"error": "Authentication required"}), 401
            
            user_role = g.current_user.get("role")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {user_role}"
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
