"""
Generates actionable monthly tasks from engine outputs.
Each task knows which profile field it affects and how.
"""
import json
from datetime import datetime
from backend.models import db, MonthlyTask, AnalysisCache, UserProfile


def _current_month():
    return datetime.utcnow().strftime('%Y-%m')


def generate_tasks_for_user(user_id):
    month = _current_month()

    completed_this_month = MonthlyTask.query.filter_by(
        user_id=user_id, month=month, status='completed'
    ).all()
    completed_keys = {(t.task_type, t.profile_field) for t in completed_this_month}

    MonthlyTask.query.filter_by(user_id=user_id, month=month, status='pending').delete()
    db.session.commit()

    cache = AnalysisCache.query.filter_by(user_id=user_id).first()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not cache or not profile:
        return completed_this_month

    fire = cache.get_fire()
    health = cache.get_health()
    tax = cache.get_tax()
    new_tasks = []

    completed_sip_names = {
        t.task_name for t in completed_this_month if t.task_type == 'sip_investment'
    }

    def _add(task_type, profile_field, **kwargs):
        if task_type != 'sip_investment' and (task_type, profile_field) in completed_keys:
            return
        new_tasks.append(MonthlyTask(
            user_id=user_id, month=month,
            task_type=task_type, profile_field=profile_field, **kwargs,
        ))

    goal_sips = fire.get('goal_sips', [])
    if goal_sips:
        for gs in goal_sips:
            sip = gs.get('monthly_sip', 0)
            gname = gs.get('name', 'Goal')
            if sip > 0:
                proposed_name = f"Invest ₹{sip:,.0f} SIP for {gname}"
                if any(gname in cn for cn in completed_sip_names):
                    continue
                _add('sip_investment', 'current_investments',
                     task_name=proposed_name,
                     engine='fire', amount=sip, priority='high', profile_op='add')
    else:
        for rec in fire.get('sip_recommendations', []):
            sip = rec.get('monthly_sip', 0)
            name = rec.get('name', 'fund')
            if sip > 0:
                proposed_name = f"Invest ₹{sip:,.0f} SIP in {name}"
                if any(name in cn for cn in completed_sip_names):
                    continue
                _add('sip_investment', 'current_investments',
                     task_name=proposed_name,
                     engine='fire', amount=sip, priority='high', profile_op='add')

    emergency_target = fire.get('emergency_target', 0)
    emergency_current = profile.emergency_fund or 0
    if emergency_target > 0 and emergency_current < emergency_target:
        gap = emergency_target - emergency_current
        monthly_chunk = min(gap, (profile.monthly_income or 0) * 0.1)
        if monthly_chunk > 0:
            _add('emergency_fund', 'emergency_fund',
                 task_name=f"Add ₹{monthly_chunk:,.0f} to emergency fund",
                 engine='fire', amount=round(monthly_chunk),
                 priority='critical' if emergency_current < emergency_target * 0.3 else 'high',
                 profile_op='add')

    ec = fire.get('edge_case')
    if ec and ec.get('type') == 'high_debt':
        debt_payment = min(profile.total_debt or 0, (profile.monthly_income or 0) * 0.2)
        if debt_payment > 0:
            _add('debt_repayment', 'total_debt',
                 task_name=f"Pay ₹{debt_payment:,.0f} towards high-interest debt",
                 engine='fire', amount=round(debt_payment), priority='critical', profile_op='subtract')

    dims = health.get('dimensions', {})

    if dims.get('savings_rate', {}).get('score', 100) < 50:
        cut = round((profile.monthly_expenses or 0) * 0.05)
        if cut > 0:
            _add('expense_reduction', 'monthly_expenses',
                 task_name=f"Reduce discretionary spending by ₹{cut:,.0f}",
                 engine='health', amount=cut, priority='high', profile_op='subtract')

    if dims.get('debt_health', {}).get('score', 100) < 50:
        emi = profile.monthly_emi or 0
        extra = round(emi * 0.1) if emi > 0 else 0
        if extra > 0:
            _add('debt_repayment', 'total_debt',
                 task_name=f"Pay ₹{extra:,.0f} extra towards loan principal",
                 engine='health', amount=extra, priority='high', profile_op='subtract')

    if dims.get('insurance_adequacy', {}).get('score', 100) < 40:
        _add('insurance_review', '',
             task_name="Review and upgrade life/health insurance coverage",
             engine='health', amount=0, priority='critical', profile_op='none')

    for s in tax.get('suggestions', []):
        inv_amount = s.get('potential_investment', 0)
        if inv_amount > 0:
            monthly_portion = round(inv_amount / 12)
            if monthly_portion > 0:
                _add('tax_saving', 'current_investments',
                     task_name=f"Invest ₹{monthly_portion:,.0f} in {s.get('name', 'tax saver')} ({s.get('section', '')})",
                     engine='tax', amount=monthly_portion, priority='medium', profile_op='add')

    prev_month_dt = datetime.utcnow().replace(day=1)
    if prev_month_dt.month == 1:
        prev_str = f"{prev_month_dt.year - 1}-12"
    else:
        prev_str = f"{prev_month_dt.year}-{prev_month_dt.month - 1:02d}"

    carryovers = MonthlyTask.query.filter_by(
        user_id=user_id, month=prev_str, status='pending'
    ).all()
    for old in carryovers:
        if (old.task_type, old.profile_field) not in completed_keys:
            already_new = any(
                t.task_type == old.task_type and t.profile_field == old.profile_field
                for t in new_tasks
            )
            if not already_new:
                new_tasks.append(MonthlyTask(
                    user_id=user_id, month=month,
                    task_name=f"[Carried] {old.task_name}",
                    task_type=old.task_type, engine=old.engine,
                    amount=old.amount, priority='high',
                    profile_field=old.profile_field, profile_op=old.profile_op,
                ))

    prev_completed = MonthlyTask.query.filter_by(
        user_id=user_id, month=prev_str, status='completed'
    ).all()
    recurring_types = {'sip_investment', 'emergency_fund'}
    for old in prev_completed:
        if old.task_type not in recurring_types:
            continue
        already_this_month = any(
            t.task_type == old.task_type and t.profile_field == old.profile_field
            for t in new_tasks
        )
        if already_this_month:
            continue
        if (old.task_type, old.profile_field) in completed_keys:
            continue
        new_tasks.append(MonthlyTask(
            user_id=user_id, month=month,
            task_name=old.task_name.replace('[Carried] ', ''),
            task_type=old.task_type, engine=old.engine,
            amount=old.amount, priority=old.priority,
            profile_field=old.profile_field, profile_op=old.profile_op,
        ))

    for t in new_tasks:
        db.session.add(t)
    db.session.commit()

    all_tasks = completed_this_month + new_tasks
    return all_tasks


def _apply_profile_update(profile, task, reverse=False):
    """Apply or reverse a task's financial impact on the user profile."""
    if not (profile and task.profile_field and task.amount > 0 and task.profile_op != 'none'):
        return
    field = task.profile_field
    current_val = getattr(profile, field, 0) or 0

    if not reverse:
        if task.profile_op == 'add':
            setattr(profile, field, round(current_val + task.amount, 2))
        elif task.profile_op == 'subtract':
            setattr(profile, field, round(max(0, current_val - task.amount), 2))
        if task.task_type == 'sip_investment':
            inv = json.loads(profile.investments_json or '{}')
            inv['equity_mf'] = (inv.get('equity_mf', 0) or 0) + task.amount
            profile.investments_json = json.dumps(inv)
    else:
        if task.profile_op == 'add':
            setattr(profile, field, round(max(0, current_val - task.amount), 2))
        elif task.profile_op == 'subtract':
            setattr(profile, field, round(current_val + task.amount, 2))
        if task.task_type == 'sip_investment':
            inv = json.loads(profile.investments_json or '{}')
            inv['equity_mf'] = max(0, (inv.get('equity_mf', 0) or 0) - task.amount)
            profile.investments_json = json.dumps(inv)


def complete_task(task_id, user_id):
    task = MonthlyTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return None, 'Task not found'
    if task.status == 'completed':
        return task, 'Already completed'

    task.status = 'completed'
    task.completed_at = datetime.utcnow()
    task.verified = False

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    _apply_profile_update(profile, task)

    db.session.commit()
    return task, 'ok'


def verify_task(task_id, user_id):
    """Mark a completed task as verified (user confirms the action was actually taken)."""
    task = MonthlyTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return None, 'Task not found'
    if task.status != 'completed':
        return task, 'Task must be completed before verification'
    task.verified = True
    db.session.commit()
    return task, 'ok'


def uncomplete_task(task_id, user_id):
    task = MonthlyTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return None, 'Task not found'
    if task.status != 'completed':
        return task, 'Not completed'

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    _apply_profile_update(profile, task, reverse=True)

    task.status = 'pending'
    task.completed_at = None
    task.verified = False
    db.session.commit()
    return task, 'ok'


def get_month_score(user_id, month=None):
    if month is None:
        month = _current_month()
    tasks = MonthlyTask.query.filter_by(user_id=user_id, month=month).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == 'completed')
    pct = round(completed / total * 100) if total > 0 else 0

    last_3 = []
    dt = datetime.utcnow()
    for i in range(3):
        m = dt.month - i
        y = dt.year
        if m <= 0:
            m += 12
            y -= 1
        m_str = f"{y}-{m:02d}"
        mt = MonthlyTask.query.filter_by(user_id=user_id, month=m_str).all()
        mt_total = len(mt)
        mt_done = sum(1 for t in mt if t.status == 'completed')
        last_3.append({'month': m_str, 'total': mt_total, 'completed': mt_done,
                       'pct': round(mt_done / mt_total * 100) if mt_total > 0 else 0})

    return {
        'month': month,
        'total': total,
        'completed': completed,
        'pending': total - completed,
        'score': pct,
        'trend': last_3,
    }
