from flask import Blueprint, request, jsonify
from backend.engines.fire_engine import generate_fire_plan

fire_bp = Blueprint('fire', __name__, url_prefix='/api/fire')


@fire_bp.route('/plan', methods=['POST'])
def plan():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    required = ['age', 'monthly_income', 'monthly_expenses']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    profile = {
        'age': int(data.get('age', 30)),
        'target_age': int(data.get('target_age', 50)),
        'monthly_income': float(data.get('monthly_income', 0)),
        'monthly_expenses': float(data.get('monthly_expenses', 0)),
        'current_savings': float(data.get('current_savings', 0)),
        'current_investments': float(data.get('current_investments', 0)),
        'total_debt': float(data.get('total_debt', 0)),
        'monthly_emi': float(data.get('monthly_emi', 0)),
        'risk_tolerance': data.get('risk_tolerance', 'moderate'),
        'goals': data.get('goals', []),
    }

    try:
        result = generate_fire_plan(profile)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
