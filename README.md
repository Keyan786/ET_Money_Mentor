# AI Money Mentor

Intelligent financial planning web application with three core modules:

- **FIRE Path Planner** — Personalized month-by-month roadmap to Financial Independence
- **Money Health Score** — Multi-dimensional financial wellness evaluation
- **Tax Wizard** — Old vs New regime comparison with optimization strategies

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Recharts
- **Backend:** Flask (Python)
- **APIs:** Alpha Vantage, Eulerpool, MFAPI, Hugging Face Inference

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API requests to the backend.
