import os
from dotenv import load_dotenv

_root = os.path.join(os.path.dirname(__file__), '..')
_env_path = os.path.join(_root, '.env')
_env_example_path = os.path.join(_root, '.env.example')

if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv(_env_example_path)

ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', '')
EULERPOOL_API_KEY = os.getenv('EULERPOOL_API_KEY', '')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY', '')

SECRET_KEY = os.getenv('SECRET_KEY', 'ai-money-mentor-dev-secret-key-32b')
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(_root, 'money_mentor.db')

ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
EULERPOOL_BASE_URL = 'https://api.eulerpool.com'
MFAPI_BASE_URL = 'https://api.mfapi.in/mf'
HUGGINGFACE_MODEL = 'Qwen/Qwen2.5-72B-Instruct'
HUGGINGFACE_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions'
