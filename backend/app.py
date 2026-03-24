import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask
from flask_cors import CORS

from backend.routes.fire_routes import fire_bp
from backend.routes.health_routes import health_bp
from backend.routes.tax_routes import tax_bp
from backend.routes.market_routes import market_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(fire_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(tax_bp)
    app.register_blueprint(market_bp)

    @app.route('/api/health-check')
    def health_check():
        return {'status': 'ok', 'app': 'AI Money Mentor'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
