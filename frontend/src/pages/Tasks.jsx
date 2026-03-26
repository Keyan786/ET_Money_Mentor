import { useState, useEffect, useCallback } from 'react';
import {
  ListChecks, RefreshCw, Loader2, CheckCircle2, Circle,
  Flame, Heart, Calculator, Sparkles, TrendingUp,
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle,
} from 'lucide-react';
import { getTasks, generateTasks, completeTask, uncompleteTask, verifyTask, getTaskFeedback } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const ENGINE_ICONS = { fire: Flame, health: Heart, tax: Calculator };
const ENGINE_COLORS = { fire: 'text-orange-500', health: 'text-emerald-500', tax: 'text-purple-500' };
const ENGINE_BG = { fire: 'bg-orange-50', health: 'bg-emerald-50', tax: 'bg-purple-50' };

const PRIORITY_DOTS = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-indigo-400',
  low: 'bg-gray-400',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getTasks()
      .then(res => { setTasks(res.data.tasks); setScore(res.data.score); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateTasks();
      setTasks(res.data.tasks);
      setScore(res.data.score);
      setFeedback(null);
    } catch {}
    setGenerating(false);
  };

  const handleToggle = async (task) => {
    setToggling(task.id);
    try {
      const fn = task.status === 'completed' ? uncompleteTask : completeTask;
      const res = await fn(task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data.task : t));
      setScore(res.data.score);
    } catch {}
    setToggling(null);
  };

  const handleVerify = async (task) => {
    setToggling(task.id);
    try {
      const res = await verifyTask(task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data.task : t));
      setScore(res.data.score);
    } catch {}
    setToggling(null);
  };

  const handleFeedback = async () => {
    setFbLoading(true);
    try {
      const res = await getTaskFeedback();
      setFeedback(res.data.feedback);
    } catch {}
    setFbLoading(false);
  };

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const grouped = {};
  for (const t of pendingTasks) {
    (grouped[t.engine] = grouped[t.engine] || []).push(t);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse mb-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
            <ListChecks size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monthly Tasks</h1>
            <p className="text-sm text-gray-500">{score?.month || 'This month'}</p>
          </div>
        </div>
        <button
          onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {generating ? 'Generating...' : tasks.length > 0 ? 'Regenerate Tasks' : 'Generate Tasks'}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-8 text-center">
          <ListChecks size={40} className="text-teal-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">No tasks yet</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
            Run a dashboard analysis first, then generate your monthly tasks. Tasks are created from your FIRE plan, health score, and tax optimization results.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScoreRing score={score?.score || 0} total={score?.total || 0} completed={score?.completed || 0} />
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-500" /> Completion Trend
                </h3>
                <button
                  onClick={handleFeedback} disabled={fbLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  {fbLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI Feedback
                </button>
              </div>
              <div className="flex gap-3">
                {(score?.trend || []).map((m) => (
                  <div key={m.month} className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{m.month}</p>
                    <p className="text-lg font-bold text-gray-900">{m.pct}%</p>
                    <p className="text-xs text-gray-500">{m.completed}/{m.total}</p>
                  </div>
                ))}
              </div>
              {feedback && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800 whitespace-pre-line">{feedback}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending tasks grouped by engine */}
          {Object.entries(grouped).map(([engine, engineTasks]) => {
            const Icon = ENGINE_ICONS[engine] || ListChecks;
            const color = ENGINE_COLORS[engine] || 'text-gray-500';
            const bg = ENGINE_BG[engine] || 'bg-gray-50';
            return (
              <div key={engine} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={`flex items-center gap-2 px-5 py-3 ${bg} border-b border-gray-100`}>
                  <Icon size={16} className={color} />
                  <h3 className="font-semibold text-gray-800 capitalize text-sm">{engine} Engine Tasks</h3>
                  <span className="ml-auto text-xs text-gray-500">{engineTasks.length} pending</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {engineTasks.map(task => (
                    <TaskRow key={task.id} task={task} toggling={toggling} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-gray-100">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h3 className="font-semibold text-gray-800 text-sm">Completed</h3>
                <span className="ml-auto text-xs text-gray-500">{completedTasks.length} done</span>
              </div>
              <div className="divide-y divide-gray-50">
                {completedTasks.map(task => (
                  <TaskRow key={task.id} task={task} toggling={toggling} onToggle={handleToggle} onVerify={handleVerify} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, toggling, onToggle, onVerify }) {
  const done = task.status === 'completed';
  const isToggling = toggling === task.id;
  const opIcon = task.profile_op === 'add' ? ArrowUpRight : task.profile_op === 'subtract' ? ArrowDownRight : Minus;
  const OpIcon = opIcon;

  return (
    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${done ? 'opacity-70' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        disabled={isToggling}
        className="shrink-0"
      >
        {isToggling ? (
          <Loader2 size={20} className="text-gray-400 animate-spin" />
        ) : done ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : (
          <Circle size={20} className="text-gray-300 hover:text-indigo-400 transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.task_name}</p>
          {done && !task.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium shrink-0">Assumed</span>
          )}
          {done && task.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium shrink-0">Verified</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOTS[task.priority]}`} />
          <span className="text-xs text-gray-400 capitalize">{task.priority}</span>
          {task.amount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <OpIcon size={10} /> {formatCurrency(task.amount)}
            </span>
          )}
          {task.profile_field && (
            <span className="text-xs text-gray-300">{task.profile_field.replace('_', ' ')}</span>
          )}
        </div>
      </div>
      {done && !task.verified && onVerify && (
        <button
          onClick={() => onVerify(task)}
          disabled={isToggling}
          className="shrink-0 text-xs font-semibold text-teal-600 hover:text-teal-800 px-2 py-1 rounded hover:bg-teal-50 transition-colors disabled:opacity-50"
        >
          Confirm
        </button>
      )}
    </div>
  );
}

function ScoreRing({ score, total, completed }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-gray-900">{score}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{completed}/{total} tasks done</p>
    </div>
  );
}
