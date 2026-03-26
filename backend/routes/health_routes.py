from flask import Blueprint, request, jsonify, g
from backend.models import UserProfile
from backend.auth_utils import require_auth
from backend.engines.health_engine import calculate_health_score

health_bp = Blueprint('health', __name__, url_prefix='/api/health')


@health_bp.route('/score', methods=['POST'])
@require_auth
def score():
    data = request.get_json() or {}

    profile_row = UserProfile.query.filter_by(user_id=g.user_id).first()
    stored = profile_row.to_dict() if profile_row else {}

    profile = {
        'age': int(data.get('age', stored.get('age', 30))),
        'monthly_income': float(data.get('monthly_income', stored.get('monthly_income', 0))),
        'monthly_expenses': float(data.get('monthly_expenses', stored.get('monthly_expenses', 0))),
        'total_debt': float(data.get('total_debt', stored.get('total_debt', 0))),
        'monthly_emi': float(data.get('monthly_emi', data.get('total_debt', stored.get('monthly_emi', 0)))),
        'emergency_fund': float(data.get('emergency_fund', stored.get('emergency_fund', 0))),
        'insurance_coverage': float(data.get('insurance_coverage', stored.get('insurance_coverage', 0))),
        'investments': data.get('investments', stored.get('investments', {})),
        'risk_tolerance': data.get('risk_tolerance', stored.get('risk_tolerance', 'moderate')),
        'annual_income': float(stored.get('annual_income', 0)),
        'deductions': stored.get('deductions', {}),
    }

    try:
        result = calculate_health_score(profile)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
