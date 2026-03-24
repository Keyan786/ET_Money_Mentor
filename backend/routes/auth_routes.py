from flask import Blueprint, request, jsonify, g
from backend.models import db, User, UserProfile
from backend.auth_utils import create_token, require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    profile = UserProfile(user_id=user.id)
    db.session.add(profile)
    db.session.commit()

    token = create_token(user.id)
    user_data = user.to_dict()
    user_data['onboarding_complete'] = False
    return jsonify({'token': token, 'user': user_data}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_token(user.id)
    user_data = user.to_dict()
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    user_data['onboarding_complete'] = profile.onboarding_complete if profile else False
    return jsonify({'token': token, 'user': user_data})


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    profile = UserProfile.query.filter_by(user_id=g.user.id).first()
    user_data = g.user.to_dict()
    user_data['onboarding_complete'] = profile.onboarding_complete if profile else False
    return jsonify({'user': user_data})
