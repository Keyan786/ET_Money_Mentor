from flask import Blueprint, request, jsonify
from backend.engines.health_engine import calculate_health_score

health_bp = Blueprint('health', __name__, url_prefix='/api/health')


@health_bp.route('/score', methods=['POST'])
def score():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    required = ['monthly_income', 'monthly_expenses']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    profile = {
        'age': int(data.get('age', 30)),
        'monthly_income': float(data.get('monthly_income', 0)),
        'monthly_expenses': float(data.get('monthly_expenses', 0)),
        'total_debt': float(data.get('total_debt', 0)),
        'emergency_fund': float(data.get('emergency_fund', 0)),
        'insurance_coverage': float(data.get('insurance_coverage', 0)),
        'investments': data.get('investments', {}),
    }

    try:
        result = calculate_health_score(profile)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
