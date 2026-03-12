

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { formatSeconds, formatDate, formatTime } from '../lib/formatters';
import { fetchMonthlyHistory, deleteDailyRecord, fetchUserSettings } from '../lib/api';
import { ConfirmModal } from './ConfirmModal';
// lib/supabase removed as it is now handled globally in App.tsx

export function HistoryList({ username, syncId }: { username: string, syncId: number }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [stats, setStats] = useState({ totalShortage: "00:00:00", daysWorked: 0 });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; date: string | null }>({ isOpen: false, date: null });

  const fetchHistory = useCallback(async () => {
    try {
      const [{ logs, totalShortage, daysWorked }, userSettings] = await Promise.all([
        fetchMonthlyHistory(username, month),
        fetchUserSettings(username)
      ]);
      setHistory(logs || []);
      setStats({ totalShortage, daysWorked });
      setSettings(userSettings);
    } catch (error) { console.error(error); }
  }, [username, month]);

  useEffect(() => { 
    // STATE SYNC: Re-fetch whenever the global syncId changes, month changes, or username changes
    if (month) {
      fetchHistory(); 
    }
  }, [fetchHistory, month, username, syncId]);

  const handleDelete = async (date: string) => {
    // Optimistic UI
    setConfirmDelete({ isOpen: false, date: null });
    const prev = [...history];
    setHistory(h => h.filter(x => x.punch_date !== date));

    try {
      await deleteDailyRecord(username, date);
      fetchHistory();
    } catch (e) { 
      console.error(e); 
      setHistory(prev);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-md mx-auto">
      <header className="mb-2">
        <h3 className="text-[#0A84FF] text-[10px] uppercase font-bold tracking-widest mb-0.5">{t('historyStat')}</h3>
        <h1 className="text-xl font-bold tracking-tight text-white">{t('history')}</h1>
      </header>

      {/* Month Selector */}
      <div className="bg-[#1C1C1E] rounded-2xl p-3 border border-[#2C2C2E] mb-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('month')}</label>
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-transparent text-white border-none outline-none text-sm font-bold text-right"
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const value = date.toISOString().substring(0, 7);
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              return (
                <option key={value} value={value} className="bg-[#1C1C1E]">
                  {t('monthOption').replace('{year}', year.toString()).replace('{month}', month.toString())}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Accumulated Shortage (Yellow Outline Card) */}
      <div className="bg-[#1C1C1E] rounded-2xl p-3 border border-[#FF9F0A]/50 mb-2 flex items-center justify-between">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('accumulatedShortage')}</p>
        <p className="text-xl font-mono text-[#FF9F0A] font-bold">{formatTime(stats.totalShortage)}</p>
      </div>

      {/* History Items */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">{t('dailyRecord')}</p>
        
        {history.map((item) => {
          const isShort = item.shortage_display !== "00:00:00";
          const workDuration = formatSeconds(item.actual_seconds || 0);

          // Calculate Early/Late
          let statusTag = null;
          if (item.start_display && item.start_display !== "--:--:--" && settings?.shift_start) {
            const punchTime = new Date(`1970-01-01T${item.start_display}`);
            const shiftStart = new Date(`1970-01-01T${settings.shift_start}`);
            const diffMinutes = (punchTime.getTime() - shiftStart.getTime()) / 60000;

            if (diffMinutes > 30) {
              statusTag = { type: 'late', message: t('lateReschedule') };
            } else if (diffMinutes > 0) {
              statusTag = { type: 'late', message: t('late') };
            } else if (diffMinutes < 0) {
              statusTag = { type: 'early', message: t('early') };
            }
          }

          return (
            <div key={item.punch_date} className={`bg-[#1C1C1E] rounded-xl p-3 border ${isShort ? 'border-[#FF9F0A]/30' : 'border-[#2C2C2E]'}`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold">{formatDate(item.punch_date)}</h4>
                <button 
                  onClick={() => setConfirmDelete({ isOpen: true, date: item.punch_date })} 
                  className="bg-[#2C2C2E] text-[10px] px-2 py-1 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>

              {/* Status Tags Row */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.hours_off > 0 && (
                  <div className="bg-[#0A84FF]/20 text-[#0A84FF] text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Calendar size={8} />
                    <span>{t('pto')}: {item.hours_off}hr</span>
                  </div>
                )}
                {statusTag && (
                  <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${statusTag.type === 'late' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {statusTag.message}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                <div className="flex gap-3">
                  <span>{t('start')}: {formatTime(item.start_display)}</span>
                  <span>{t('end')}: {(item.end_display === item.start_display && item.start_display !== "--:--:--") ? "" : (item.is_goal_reached ? formatTime(item.end_display) : "--:--:--")}</span>
                </div>
                <span className="text-[#FF9F0A] font-bold">{workDuration}</span>
              </div>

              {isShort && (
                <div className="flex items-center gap-1 text-[#FF9F0A] text-[9px] mt-1 uppercase font-bold">
                  <AlertTriangle size={10} />
                  <span>{t('shortageWarning').replace('{shortage}', formatTime(item.shortage_display))}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, date: null })}
        onConfirm={() => confirmDelete.date && handleDelete(confirmDelete.date)}
        message={t('deleteConfirm')}
      />
    </div>
  );
}