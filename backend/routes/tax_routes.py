from flask import Blueprint, request, jsonify
from backend.engines.tax_engine import optimize_tax

tax_bp = Blueprint('tax', __name__, url_prefix='/api/tax')


@tax_bp.route('/optimize', methods=['POST'])
def optimize():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    if 'annual_income' not in data:
        return jsonify({'error': 'Missing field: annual_income'}), 400

    profile = {
        'annual_income': float(data.get('annual_income', 0)),
        'deductions': data.get('deductions', {}),
        'regime_preference': data.get('regime_preference', 'auto'),
    }

    try:
        result = optimize_tax(profile)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
