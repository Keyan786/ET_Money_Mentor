from flask import Blueprint, request, jsonify, g
from backend.engines.tax_engine import optimize_tax
from backend.services.form16_parser import parse_form16_pdf
from backend.auth_utils import require_auth
from backend.models import UserProfile, db
import json

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
        'risk_tolerance': data.get('risk_tolerance', 'moderate'),
    }

    try:
        result = optimize_tax(profile)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tax_bp.route('/upload-form16', methods=['POST'])
@require_auth
def upload_form16():
    """Parse uploaded Form 16 PDF and return extracted data.
    Optionally auto-saves extracted deductions to user profile."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Use field name "file".'}), 400

    f = request.files['file']
    if not f.filename or not f.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Please upload a PDF file.'}), 400

    file_bytes = f.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        return jsonify({'error': 'File too large. Max 10 MB.'}), 400

    parsed = parse_form16_pdf(file_bytes)
    if 'error' in parsed:
        return jsonify(parsed), 400

    auto_save = request.form.get('auto_save', 'false').lower() == 'true'
    if auto_save:
        profile = UserProfile.query.filter_by(user_id=g.user_id).first()
        if profile:
            if parsed['gross_salary'] > 0:
                profile.annual_income = parsed['gross_salary']
            existing_ded = json.loads(profile.deductions_json or '{}')
            for key, val in parsed['deductions'].items():
                mapped_key = {
                    '80C': 'section_80c', '80D': 'section_80d',
                    '80CCD': 'nps', 'HRA': 'hra',
                    '80E': '80E', '80G': '80G', '80TTA': '80TTA',
                }.get(key, key)
                if val > 0:
                    existing_ded[mapped_key] = val
            profile.deductions_json = json.dumps(existing_ded)
            db.session.commit()
            parsed['saved_to_profile'] = True

    return jsonify(parsed)
