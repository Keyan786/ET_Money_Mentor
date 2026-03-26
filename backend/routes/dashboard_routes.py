import json
import time
from datetime import datetime
from flask import Blueprint, request, jsonify, g, Response, stream_with_context, current_app
from backend.models import db, UserProfile, AnalysisCache
from backend.auth_utils import require_auth, decode_token
from backend.engines.fire_engine import generate_fire_plan
from backend.engines.health_engine import calculate_health_score
from backend.engines.tax_engine import optimize_tax
from backend.services.alpha_vantage import get_market_overview
from backend.services.eulerpool import get_economic_summary
from backend.engines.task_engine import generate_tasks_for_user, get_month_score
from backend.models import MonthlyTask

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


def _completed_task_types(user_id):
    """Return set of (task_type, engine) pairs completed this month."""
    month = datetime.utcnow().strftime('%Y-%m')
    done = MonthlyTask.query.filter_by(user_id=user_id, month=month, status='completed').all()
    return {(t.task_type, t.engine) for t in done}


def _build_next_actions(fire, health, tax, completed=None):
    completed = completed or set()
    actions = []

    if fire:
        ec = fire.get('edge_case')
        if ec and ('debt_repayment', 'fire') not in completed:
            actions.append({'engine': 'fire', 'action': ec.get('priority_action', ''), 'priority': 'critical', 'title': ec.get('title', '')})
        proj = fire.get('projections', {})
        if proj.get('monthly_sip', 0) > 0 and ('sip_investment', 'fire') not in completed:
            actions.append({'engine': 'fire', 'action': f"Start SIP of ₹{proj['monthly_sip']:,.0f}/month across recommended funds", 'priority': 'high', 'title': 'SIP Investment'})

    if health:
        dims = health.get('dimensions', {})
        type_map = {
            'savings_rate': 'expense_reduction',
            'debt_health': 'debt_repayment',
            'emergency_preparedness': 'emergency_fund',
            'investment_diversification': None,
            'insurance_adequacy': 'insurance_review',
            'retirement_readiness': None,
            'tax_efficiency': 'tax_saving',
        }
        for key, dim in dims.items():
            task_type = type_map.get(key)
            if task_type and (task_type, 'health') in completed:
                continue
            score = dim.get('score', 100)
            if score >= 60:
                continue
            label = key.replace('_', ' ').title()
            entry = {
                'engine': 'health',
                'action': dim.get('advice', ''),
                'priority': 'critical' if score < 40 else 'high',
                'title': label,
                'progress': score,
                'dimension': key,
            }
            actions.append(entry)

    if tax:
        for s in tax.get('suggestions', []):
            if s.get('potential_tax_saved', 0) > 0 and ('tax_saving', 'tax') not in completed:
                actions.append({'engine': 'tax', 'action': s.get('description', ''), 'priority': 'medium', 'title': f"Tax: {s.get('name', '')}"})

    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    actions.sort(key=lambda a: priority_order.get(a['priority'], 3))
    return actions[:8]


def _build_alerts(fire, health):
    alerts = []
    if health:
        dims = health.get('dimensions', {})
        for key, dim in dims.items():
            score = dim.get('score', 100)
            label = key.replace('_', ' ').title()
            if score < 30:
                alerts.append({'severity': 'critical', 'dimension': label, 'message': dim.get('advice', ''), 'score': score})
            elif score < 50:
                alerts.append({'severity': 'high', 'dimension': label, 'message': dim.get('advice', ''), 'score': score})

    if fire and fire.get('edge_case'):
        ec = fire['edge_case']
        alerts.append({'severity': 'critical', 'dimension': ec.get('title', 'FIRE'), 'message': ec.get('message', '')})

    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    alerts.sort(key=lambda a: severity_order.get(a['severity'], 3))
    return alerts


def _build_goal_progress(fire, profile_dict):
    if not fire:
        return None
    proj = fire.get('projections', {})
    fire_num = proj.get('fire_number', 0)
    emergency_target = fire.get('emergency_target', 0)

    live_portfolio = profile_dict.get('current_savings', 0) + profile_dict.get('current_investments', 0)
    pct = round(live_portfolio / fire_num * 100, 1) if fire_num > 0 else 0

    milestones = [
        ('Emergency Fund Complete', emergency_target),
        ('25% FIRE', fire_num * 0.25),
        ('50% FIRE', fire_num * 0.50),
        ('75% FIRE', fire_num * 0.75),
        ('FIRE Achieved', fire_num),
    ]
    milestones_hit = [
        {'name': name}
        for name, threshold in milestones
        if threshold > 0 and live_portfolio >= threshold
    ]

    return {
        'fire_number': fire_num,
        'current_portfolio': round(live_portfolio),
        'percent_complete': pct,
        'fire_date': proj.get('fire_date', 'N/A'),
        'blended_real_return': proj.get('blended_real_return'),
        'milestones_hit': milestones_hit,
    }


def _build_monthly_plan(fire, tax):
    plan = {'total_sip': 0, 'sip_breakdown': [], 'tax_actions': []}
    if fire:
        for rec in fire.get('sip_recommendations', []):
            plan['sip_breakdown'].append({
                'name': rec.get('name', ''),
                'asset_class': rec.get('asset_class', ''),
                'monthly_sip': rec.get('monthly_sip', 0),
            })
            plan['total_sip'] += rec.get('monthly_sip', 0)
    if tax:
        for s in tax.get('suggestions', []):
            if s.get('potential_investment', 0) > 0:
                plan['tax_actions'].append({
                    'name': s.get('name', ''),
                    'section': s.get('section', ''),
                    'amount': s.get('potential_investment', 0),
                    'tax_saved': s.get('potential_tax_saved', 0),
                })
    return plan


def _investment_value(profile_dict):
    """Return the best estimate of total investments without double-counting.
    Use the breakdown sum if it accounts for >= 90% of the headline figure
    (i.e. user filled in the breakdown completely). Otherwise fall back to
    the single current_investments field."""
    inv = profile_dict.get('investments', {})
    breakdown_total = sum(v for v in inv.values() if isinstance(v, (int, float))) if isinstance(inv, dict) else 0
    headline = profile_dict.get('current_investments', 0)
    if breakdown_total > 0 and (headline == 0 or breakdown_total >= headline * 0.9):
        return breakdown_total
    return headline


def _build_net_worth(profile_dict):
    assets = (
        profile_dict.get('current_savings', 0)
        + profile_dict.get('emergency_fund', 0)
        + _investment_value(profile_dict)
    )
    liabilities = profile_dict.get('total_debt', 0)
    return {'assets': round(assets), 'liabilities': round(liabilities), 'net': round(assets - liabilities)}


def _build_dashboard_response(profile_dict, fire, health, tax, user_id=None):
    market = get_market_overview()
    economic = get_economic_summary()
    completed = _completed_task_types(user_id) if user_id else set()
    health_dims = {}
    if health:
        for k, v in health.get('dimensions', {}).items():
            health_dims[k] = v.get('score', 0)
    return {
        'profile': profile_dict,
        'has_analysis': bool(fire or health or tax),
        'next_actions': _build_next_actions(fire, health, tax, completed),
        'goal_progress': _build_goal_progress(fire, profile_dict),
        'monthly_plan': _build_monthly_plan(fire, tax),
        'net_worth': _build_net_worth(profile_dict),
        'alerts': _build_alerts(fire, health),
        'ai_insight': fire.get('ai_insights', {}).get('summary', '') if fire else '',
        'health_score': health.get('overall_score') if health else None,
        'health_zone': health.get('zone_label') if health else None,
        'health_dimensions': health_dims,
        'tax_savings': tax.get('total_potential_tax_saved', 0) if tax else 0,
        'recommended_regime': tax.get('recommended_regime') if tax else None,
        'market': market,
        'economic': economic,
        'computed_at': None,
    }


@dashboard_bp.route('', methods=['GET'])
@require_auth
def get_dashboard():
    profile = UserProfile.query.filter_by(user_id=g.user_id).first()
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404

    profile_dict = profile.to_dict()
    cache = AnalysisCache.query.filter_by(user_id=g.user_id).first()

    task_score = get_month_score(g.user_id)
    pending_tasks = MonthlyTask.query.filter_by(
        user_id=g.user_id, month=datetime.utcnow().strftime('%Y-%m'), status='pending'
    ).limit(5).all()

    if cache:
        fire = cache.get_fire()
        health = cache.get_health()
        tax = cache.get_tax()
        resp = _build_dashboard_response(profile_dict, fire, health, tax, user_id=g.user_id)
        resp['computed_at'] = cache.computed_at.isoformat() if cache.computed_at else None
        resp['task_score'] = task_score
        resp['pending_tasks'] = [t.to_dict() for t in pending_tasks]
        return jsonify(resp)

    resp = _build_dashboard_response(profile_dict, {}, {}, {}, user_id=g.user_id)
    resp['task_score'] = task_score
    resp['pending_tasks'] = [t.to_dict() for t in pending_tasks]
    return jsonify(resp)


@dashboard_bp.route('/calendar', methods=['GET'])
@require_auth
def get_calendar():
    """Return task completion stats for the last 12 months."""
    dt = datetime.utcnow()
    months = []
    for i in range(11, -1, -1):
        m = dt.month - i
        y = dt.year
        while m <= 0:
            m += 12
            y -= 1
        m_str = f"{y}-{m:02d}"
        tasks = MonthlyTask.query.filter_by(user_id=g.user_id, month=m_str).all()
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == 'completed')
        months.append({
            'month': m_str,
            'total': total,
            'completed': completed,
            'score': round(completed / total * 100) if total > 0 else 0,
        })
    return jsonify({'months': months})


@dashboard_bp.route('/refresh', methods=['GET'])
def refresh_dashboard():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing token'}), 401
    token = auth_header.split(' ', 1)[1]
    try:
        payload = decode_token(token)
        user_id = payload['user_id']
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401

    app = current_app._get_current_object()

    def generate():
        with app.app_context():
            def send_step(step, total, message):
                data = json.dumps({'step': step, 'total': total, 'message': message})
                return f"data: {data}\n\n"

            total_steps = 9

            yield send_step(1, total_steps, 'Loading your financial profile...')
            profile = UserProfile.query.filter_by(user_id=user_id).first()
            if not profile:
                yield f"data: {json.dumps({'error': 'Profile not found'})}\n\n"
                return
            profile_dict = profile.to_dict()

            yield send_step(2, total_steps, 'Fetching market data and economic indicators...')
            market = get_market_overview()
            economic = get_economic_summary()

            yield send_step(3, total_steps, 'Calculating FIRE projections with real returns...')
            additional_context = profile_dict.get('additional_context', '')
            fire_profile = {
                'age': profile_dict['age'],
                'target_age': profile_dict['target_age'],
                'monthly_income': profile_dict['monthly_income'],
                'monthly_expenses': profile_dict['monthly_expenses'],
                'current_savings': profile_dict['current_savings'],
                'current_investments': profile_dict['current_investments'],
                'total_debt': profile_dict['total_debt'],
                'monthly_emi': profile_dict.get('monthly_emi', 0),
                'risk_tolerance': profile_dict['risk_tolerance'],
                'goals': profile_dict.get('goals', []),
                'additional_context': additional_context,
            }
            fire_result = generate_fire_plan(fire_profile)

            yield send_step(4, total_steps, 'Evaluating your financial health across 6 dimensions...')
            health_profile = {
                'age': profile_dict['age'],
                'monthly_income': profile_dict['monthly_income'],
                'monthly_expenses': profile_dict['monthly_expenses'],
                'total_debt': profile_dict['total_debt'],
                'monthly_emi': profile_dict.get('monthly_emi', 0),
                'emergency_fund': profile_dict['emergency_fund'],
                'insurance_coverage': profile_dict['insurance_coverage'],
                'investments': profile_dict['investments'],
                'risk_tolerance': profile_dict.get('risk_tolerance', 'moderate'),
                'annual_income': profile_dict.get('annual_income', 0),
                'deductions': profile_dict.get('deductions', {}),
                'additional_context': additional_context,
            }
            health_result = calculate_health_score(health_profile)

            yield send_step(5, total_steps, 'Optimizing tax strategy (Old vs New regime)...')
            tax_profile = {
                'annual_income': profile_dict['annual_income'],
                'deductions': profile_dict['deductions'],
                'regime_preference': 'auto',
                'risk_tolerance': profile_dict.get('risk_tolerance', 'moderate'),
            }
            tax_result = optimize_tax(tax_profile)

            yield send_step(6, total_steps, 'Saving analysis results...')
            cache = AnalysisCache.query.filter_by(user_id=user_id).first()
            if not cache:
                cache = AnalysisCache(user_id=user_id)
                db.session.add(cache)
            cache.fire_result_json = json.dumps(fire_result, default=str)
            cache.health_result_json = json.dumps(health_result, default=str)
            cache.tax_result_json = json.dumps(tax_result, default=str)
            cache.computed_at = datetime.utcnow()
            db.session.commit()

            yield send_step(7, total_steps, 'Generating monthly action tasks...')
            generate_tasks_for_user(user_id)
            task_score = get_month_score(user_id)
            pending = MonthlyTask.query.filter_by(
                user_id=user_id, month=datetime.utcnow().strftime('%Y-%m'), status='pending'
            ).limit(5).all()

            yield send_step(8, total_steps, 'Compiling recommendations and alerts...')
            live_profile = UserProfile.query.filter_by(user_id=user_id).first()
            live_profile_dict = live_profile.to_dict() if live_profile else profile_dict
            resp = _build_dashboard_response(live_profile_dict, fire_result, health_result, tax_result, user_id=user_id)
            resp['market'] = market
            resp['economic'] = economic
            resp['computed_at'] = cache.computed_at.isoformat()
            resp['task_score'] = task_score
            resp['pending_tasks'] = [t.to_dict() for t in pending]

            yield send_step(9, total_steps, 'Analysis complete!')
            yield f"data: {json.dumps({'done': True, 'dashboard': resp}, default=str)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
