from flask import Blueprint, request, jsonify, g
from backend.models import db, UserProfile
from backend.auth_utils import require_auth

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')


@profile_bp.route('', methods=['GET'])
@require_auth
def get_profile():
    profile = UserProfile.query.filter_by(user_id=g.user_id).first()
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
    return jsonify(profile.to_dict())


@profile_bp.route('', methods=['PUT'])
@require_auth
def update_profile():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    profile = UserProfile.query.filter_by(user_id=g.user_id).first()
    if not profile:
        profile = UserProfile(user_id=g.user_id)
        db.session.add(profile)

    profile.update_from_dict(data)
    db.session.commit()
    return jsonify(profile.to_dict())
