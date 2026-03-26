from flask import Blueprint, request, jsonify, g
from backend.models import db, MonthlyTask
from backend.auth_utils import require_auth
from backend.engines.task_engine import (
    generate_tasks_for_user, complete_task, uncomplete_task, verify_task, get_month_score,
)
from backend.services.huggingface import generate_task_feedback

task_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')


@task_bp.route('', methods=['GET'])
@require_auth
def list_tasks():
    month = request.args.get('month')
    query = MonthlyTask.query.filter_by(user_id=g.user_id)
    if month:
        query = query.filter_by(month=month)
    else:
        from datetime import datetime
        query = query.filter_by(month=datetime.utcnow().strftime('%Y-%m'))

    tasks = query.order_by(MonthlyTask.created_at).all()
    score = get_month_score(g.user_id, month)
    return jsonify({'tasks': [t.to_dict() for t in tasks], 'score': score})


@task_bp.route('/generate', methods=['POST'])
@require_auth
def generate():
    tasks = generate_tasks_for_user(g.user_id)
    score = get_month_score(g.user_id)
    return jsonify({
        'tasks': [t.to_dict() for t in tasks],
        'score': score,
        'message': f'{len(tasks)} tasks generated for this month',
    })


@task_bp.route('/<int:task_id>/complete', methods=['POST'])
@require_auth
def mark_complete(task_id):
    task, msg = complete_task(task_id, g.user_id)
    if not task:
        return jsonify({'error': msg}), 404
    score = get_month_score(g.user_id)
    return jsonify({'task': task.to_dict(), 'score': score, 'message': msg})


@task_bp.route('/<int:task_id>/uncomplete', methods=['POST'])
@require_auth
def mark_uncomplete(task_id):
    task, msg = uncomplete_task(task_id, g.user_id)
    if not task:
        return jsonify({'error': msg}), 404
    score = get_month_score(g.user_id)
    return jsonify({'task': task.to_dict(), 'score': score, 'message': msg})


@task_bp.route('/<int:task_id>/verify', methods=['POST'])
@require_auth
def mark_verified(task_id):
    task, msg = verify_task(task_id, g.user_id)
    if not task:
        return jsonify({'error': msg}), 404
    score = get_month_score(g.user_id)
    return jsonify({'task': task.to_dict(), 'score': score, 'message': msg})


@task_bp.route('/score', methods=['GET'])
@require_auth
def score():
    month = request.args.get('month')
    return jsonify(get_month_score(g.user_id, month))


@task_bp.route('/feedback', methods=['GET'])
@require_auth
def feedback():
    score_data = get_month_score(g.user_id)
    fb = generate_task_feedback(score_data)
    return jsonify({'feedback': fb, 'score': score_data})
