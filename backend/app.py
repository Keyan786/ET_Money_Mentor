import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask
from flask_cors import CORS

from backend.config import SECRET_KEY, SQLALCHEMY_DATABASE_URI
from backend.models import db, bcrypt

from backend.routes.fire_routes import fire_bp
from backend.routes.health_routes import health_bp
from backend.routes.tax_routes import tax_bp
from backend.routes.market_routes import market_bp
from backend.routes.auth_routes import auth_bp
from backend.routes.profile_routes import profile_bp
from backend.routes.dashboard_routes import dashboard_bp


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app, supports_credentials=True)
    db.init_app(app)
    bcrypt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(fire_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(tax_bp)
    app.register_blueprint(market_bp)

    with app.app_context():
        db.create_all()

    @app.route('/api/health-check')
    def health_check():
        return {'status': 'ok', 'app': 'AI Money Mentor'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
