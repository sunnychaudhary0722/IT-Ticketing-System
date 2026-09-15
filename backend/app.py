import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Add current directory to path so relative imports work seamlessly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db
from seed import seed_initial_data
from routes.auth_routes import auth_bp
from routes.ticket_routes import ticket_bp
from routes.comment_routes import comment_bp
from routes.user_routes import user_bp
from routes.stats_routes import stats_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Auto seed initial database data if empty
    try:
        seed_initial_data()
    except Exception as e:
        print(f"Seed note: {e}")

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(ticket_bp)
    app.register_blueprint(comment_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(stats_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'IT Help Desk & Ticketing System REST API',
            'version': '1.0.0',
            'stack': {
                'backend': 'Python Flask',
                'database': 'MongoDB with PyMongo',
                'auth': 'JWT (HMAC-SHA256) & bcrypt'
            }
        }), 200

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'An internal server error occurred'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    # In cloud containers, PORT might be set to 8080 for internal routing.
    # Flask backend runs on internal port 5000, proxied by Vite on port 3000.
    port = int(os.environ.get('FLASK_PORT', 5000))
    print(f"Python Flask REST API running on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
