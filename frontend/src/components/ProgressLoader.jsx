import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const ALL_STEPS = [
  'Loading your financial profile...',
  'Fetching market data and economic indicators...',
  'Calculating FIRE projections with real returns...',
  'Evaluating your financial health across 6 dimensions...',
  'Optimizing tax strategy (Old vs New regime)...',
  'Saving analysis results...',
  'Generating monthly action tasks...',
  'Compiling recommendations and alerts...',
  'Analysis complete!',
];

export default function ProgressLoader({ onComplete, token }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState('Starting analysis...');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const url = `/api/dashboard/refresh`;
    const es = new EventSource(url);

    // EventSource doesn't support custom headers, so we use a workaround:
    // close the native EventSource and use fetch with SSE parsing instead
    es.close();

    const controller = new AbortController();

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
                return;
              }
              if (data.step) {
                setCurrentStep(data.step);
                setStepMessage(data.message);
              }
              if (data.done && data.dashboard) {
                setDone(true);
                setCurrentStep(ALL_STEPS.length);
                setTimeout(() => onComplete(data.dashboard), 600);
              }
            } catch {}
          }
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        setError('Connection lost. Please try again.');
      }
    });

    return () => controller.abort();
  }, [token, onComplete]);

  const totalSteps = ALL_STEPS.length;
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Analyzing Your Finances</h3>
        <p className="text-sm text-gray-500 mb-5">Running all engines to build your personalized dashboard</p>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">{error}</div>
        ) : (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {ALL_STEPS.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep && !done;
                const isDone = stepNum < currentStep || done;

                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive ? 'bg-indigo-50' : isDone ? 'bg-gray-50' : ''
                  }`}>
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <Loader2 size={18} className="text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <Circle size={18} className="text-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm ${
                      isActive ? 'text-indigo-700 font-medium' : isDone ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
