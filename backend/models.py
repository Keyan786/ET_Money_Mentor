import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all,delete')
    analysis_cache = db.relationship('AnalysisCache', backref='user', uselist=False, cascade='all,delete')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'created_at': self.created_at.isoformat()}


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    age = db.Column(db.Integer, default=30)
    monthly_income = db.Column(db.Float, default=0)
    monthly_expenses = db.Column(db.Float, default=0)
    current_savings = db.Column(db.Float, default=0)
    current_investments = db.Column(db.Float, default=0)
    total_debt = db.Column(db.Float, default=0)
    emergency_fund = db.Column(db.Float, default=0)
    insurance_coverage = db.Column(db.Float, default=0)
    investments_json = db.Column(db.Text, default='{}')
    annual_income = db.Column(db.Float, default=0)
    deductions_json = db.Column(db.Text, default='{}')
    monthly_emi = db.Column(db.Float, default=0)
    risk_tolerance = db.Column(db.String(20), default='moderate')
    target_age = db.Column(db.Integer, default=50)
    goals_json = db.Column(db.Text, default='[]')
    additional_context = db.Column(db.Text, default='')
    onboarding_complete = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'age': self.age,
            'monthly_income': self.monthly_income,
            'monthly_expenses': self.monthly_expenses,
            'current_savings': self.current_savings,
            'current_investments': self.current_investments,
            'total_debt': self.total_debt,
            'emergency_fund': self.emergency_fund,
            'insurance_coverage': self.insurance_coverage,
            'investments': json.loads(self.investments_json or '{}'),
            'annual_income': self.annual_income,
            'deductions': json.loads(self.deductions_json or '{}'),
            'monthly_emi': self.monthly_emi,
            'risk_tolerance': self.risk_tolerance,
            'target_age': self.target_age,
            'goals': json.loads(self.goals_json or '[]'),
            'additional_context': self.additional_context or '',
            'onboarding_complete': self.onboarding_complete,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def update_from_dict(self, data):
        for field in ['age', 'monthly_income', 'monthly_expenses', 'current_savings',
                      'current_investments', 'total_debt', 'monthly_emi', 'emergency_fund',
                      'insurance_coverage', 'annual_income', 'risk_tolerance', 'target_age',
                      'additional_context', 'onboarding_complete']:
            if field in data:
                setattr(self, field, data[field])
        if 'investments' in data:
            self.investments_json = json.dumps(data['investments'])
        if 'deductions' in data:
            self.deductions_json = json.dumps(data['deductions'])
        if 'goals' in data:
            self.goals_json = json.dumps(data['goals'])


class MonthlyTask(db.Model):
    __tablename__ = 'monthly_tasks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    task_name = db.Column(db.String(300), nullable=False)
    task_type = db.Column(db.String(50), nullable=False)
    engine = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, default=0)
    status = db.Column(db.String(20), default='pending')
    priority = db.Column(db.String(20), default='medium')
    profile_field = db.Column(db.String(50), default='')
    profile_op = db.Column(db.String(10), default='add')
    month = db.Column(db.String(7), nullable=False)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'task_name': self.task_name,
            'task_type': self.task_type,
            'engine': self.engine,
            'amount': self.amount,
            'status': self.status,
            'priority': self.priority,
            'profile_field': self.profile_field,
            'profile_op': self.profile_op,
            'month': self.month,
            'verified': self.verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class AnalysisCache(db.Model):
    __tablename__ = 'analysis_cache'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    fire_result_json = db.Column(db.Text, default='{}')
    health_result_json = db.Column(db.Text, default='{}')
    tax_result_json = db.Column(db.Text, default='{}')
    computed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_fire(self):
        return json.loads(self.fire_result_json or '{}')

    def get_health(self):
        return json.loads(self.health_result_json or '{}')

    def get_tax(self):
        return json.loads(self.tax_result_json or '{}')
