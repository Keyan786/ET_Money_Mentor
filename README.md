# AI Money Mentor

**AI Money Mentor** is an intelligent, comprehensive financial planning web application designed to empower users to take control of their financial future. By leveraging modern AI and real-time financial data, the platform provides personalized, actionable insights tailored to individual financial goals. Whether you are aiming for early retirement, looking to assess your current financial wellness, or seeking to optimize your tax strategy, AI Money Mentor offers a holistic suite of tools to guide you every step of the way.

## Core Modules

The application is built around three primary, feature-rich modules:

### 1. FIRE Path Planner
The **Financial Independence, Retire Early (FIRE) Path Planner** is a dynamic forecasting tool that helps you chart a personalized roadmap to financial freedom. 
- **Personalized Projections:** Generates a month-by-month growth trajectory of your investments, factoring in your savings rate, expected returns, and inflation.
- **Scenario Analysis:** Allows you to adjust variables like retirement age and post-retirement expenses to visualize different financial outcomes.
- **Actionable Steps:** Breaks down long-term goals into manageable monthly targets.

### 2. Money Health Score
The **Money Health Score** module provides a multi-dimensional evaluation of your overall financial wellness.
- **Comprehensive Assessment:** Evaluates key metrics including liquidity, debt-to-income ratio, emergency fund adequacy, and savings rate.
- **Actionable Insights:** Delivers targeted recommendations to improve weak areas in your financial profile.
- **Progress Tracking:** Monitors your financial health over time, celebrating milestones and alerting you to potential risks.

### 3. Tax Wizard
The **Tax Wizard** is an intelligent tax planning assistant that demystifies tax optimization.
- **Regime Comparison:** Automatically compares the Old vs. New tax regimes based on your income and deductions to recommend the most beneficial option.
- **Optimization Strategies:** Suggests investment avenues (e.g., Section 80C, 80D, NPS) to maximize tax savings under the Old Regime.
- **Real-time Calculations:** Instantly updates tax liability as you modify your financial inputs.

## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Recharts
- **Backend:** Flask (Python)
- **APIs:** Alpha Vantage, Eulerpool, MFAPI, Hugging Face Inference

## Setup

### 1. Environment variables

Copy `.env` and fill in your API keys:

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
