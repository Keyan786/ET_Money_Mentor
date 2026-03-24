from flask import Blueprint, jsonify
from backend.services.alpha_vantage import get_market_overview
from backend.services.mfapi import get_fund_data
from backend.services.eulerpool import get_economic_summary

market_bp = Blueprint('market', __name__, url_prefix='/api/market')


@market_bp.route('/overview', methods=['GET'])
def overview():
    try:
        market = get_market_overview()
        economic = get_economic_summary()
        return jsonify({
            'market': market,
            'economic': economic,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@market_bp.route('/fund/<code>', methods=['GET'])
def fund(code):
    try:
        data = get_fund_data(code)
        if 'error' in data:
            return jsonify(data), 502
        meta = data.get('meta', {})
        nav_data = data.get('data', [])
        return jsonify({
            'meta': meta,
            'latest_nav': nav_data[0] if nav_data else None,
            'history_count': len(nav_data),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
