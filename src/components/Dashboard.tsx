

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Fingerprint, Settings, Calendar, X, Trash2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { formatSeconds, formatTime, formatDate, formatDateDash } from '../lib/formatters';
import { 
  fetchDashboardByDate, 
  addPunch, 
  logLeaveHours, 
  fetchRawPunchesByDate, 
  deleteSpecificPunch,
  fetchUserSettings,
  fetchUserPto,
  deletePtoRecord
} from '../lib/api';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { SettingsModal } from './SettingsModal';
import { ConfirmModal } from './ConfirmModal';
// lib/supabase removed as it is now handled globally in App.tsx

const calculatePunchedSeconds = (punches: any[]) => {
  // punches are in descending order (latest first)
  const sorted = [...punches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let total = 0;
  for (let i = 0; i < sorted.length; i += 2) {
    if (sorted[i] && sorted[i+1]) {
      const start = new Date(sorted[i].created_at).getTime();
      const end = new Date(sorted[i+1].created_at).getTime();
      total += Math.floor((end - start) / 1000);
    }
  }
  return total;
};

export function Dashboard({ username, syncId }: { username: string, syncId: number, onLogout: () => void }) {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(formatDateDash());

  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showPto, setShowPto] = useState(false);
  const [showManagePto, setShowManagePto] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [confirmDeletePto, setConfirmDeletePto] = useState<{ isOpen: boolean; date: string | null }>({ isOpen: false, date: null });
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // Data for Modals
  const [rawPunchesForToday, setRawPunchesForToday] = useState<any[]>([]);
  const [userPtos, setUserPtos] = useState<any[]>([]);
  const [manualTime, setManualTime] = useState('09:00');

  const fetchStatus = useCallback(async () => {
    console.log('Fetching status for:', username, selectedDate);
    try {
      const [viewData, userSettings, punches] = await Promise.all([
        fetchDashboardByDate(username, selectedDate),
        fetchUserSettings(username),
        fetchRawPunchesByDate(username, selectedDate)
      ]);
      setData(viewData);
      setSettings(userSettings);
      setRawPunchesForToday(punches);
    } catch (error) {
      console.error(error);
    }
  }, [username, selectedDate]);

  useEffect(() => { 
    // STATE SYNC: Re-fetch whenever the global syncId changes or username/date changes
    setMounted(true);
    fetchStatus(); 
  }, [fetchStatus, username, syncId]);

  // Real-time clock for "Live" updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Quick Punch (Now)
  const handlePunch = async () => {
    console.log('[Dashboard] handlePunch triggered (Quick Punch)');
    const now = new Date();
    
    // Optimistic UI Update
    const newPunch = {
      id: Date.now(), // Temporary ID
      username,
      punch_date: now.toLocaleDateString('en-CA'),
      punch_time: now.toTimeString().split(' ')[0],
      is_manual: false,
      created_at: now.toISOString()
    };
    
    setRawPunchesForToday(prev => [newPunch, ...prev]);
    
    try {
      // Real-time punch: isManual = false
      console.log('[Dashboard] Calling addPunch with isManual=false');
      await addPunch(username, now.toLocaleDateString('en-CA'), now.toTimeString().split(' ')[0], false);
      fetchStatus();
    } catch (e) { 
        console.error(e);
        // Revert Optimistic UI if failed
        setRawPunchesForToday(prev => prev.filter(p => p.id !== newPunch.id));
    }
  };

  // Handle Manual Punch Form Submit
  const submitManualPunch = async () => {
    console.log('[Dashboard] submitManualPunch triggered (Manual Picker)');
    
    // Optimistic UI Update
    const mockDate = new Date(`${selectedDate}T${manualTime}:00`);
    const newPunch = {
      id: Date.now(), // Temporary ID
      username,
      punch_date: selectedDate,
      punch_time: `${manualTime}:00`,
      is_manual: true,
      created_at: mockDate.toISOString()
    };
    
    setRawPunchesForToday(prev => [newPunch, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setShowManual(false);

    try {
      // Manual punch: isManual = true
      console.log('[Dashboard] Calling addPunch with isManual=true');
      await addPunch(username, selectedDate, `${manualTime}:00`, true);
      fetchStatus();
    } catch (err) { 
        console.error(err);
        // Revert Optimistic UI if failed
        setRawPunchesForToday(prev => prev.filter(p => p.id !== newPunch.id));
    }
  };

  // Handle PTO Form Submit
  const handlePto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const hours = Number(formData.get('hours'));
    if (date && hours) {
      // Optimistic UI
      setShowPto(false);
      if (date === selectedDate) {
        setData((d: any) => d ? { ...d, hours_off: hours } : d);
      }
      try {
        await logLeaveHours(username, date, hours);
        fetchStatus();
      } catch (err) { 
        console.error(err);
        fetchStatus(); // fallback 
      }
    }
  };

  // Open "Clear Punch" Modal
  const openPunchManager = async () => {
    setShowClearModal(true);
  };

  // Open "Manage PTO" Modal
  const openPtoManager = async () => {
    try {
      const records = await fetchUserPto(username);
      setUserPtos(records);
      setShowManagePto(true);
    } catch (e) { console.error(e); }
  };

  // Delete Specific Raw Punch
  const handleDeletePunch = async (id: number) => {
    // Optimistic UI
    setConfirmDelete({ isOpen: false, id: null });
    const prev = [...rawPunchesForToday];
    setRawPunchesForToday(p => p.filter(x => x.id !== id));

    try {
      await deleteSpecificPunch(id);
      fetchStatus();
    } catch (e) { 
      console.error(e); 
      setRawPunchesForToday(prev);
    }
  };

  // Delete Specific PTO Record
  const handleDeletePto = async (date: string) => {
    // Optimistic UI
    setConfirmDeletePto({ isOpen: false, date: null });
    const prev = [...userPtos];
    setUserPtos(p => p.filter(x => x.pto_date !== date));
    if (date === selectedDate) {
      setData((d: any) => d ? { ...d, hours_off: 0 } : d);
    }

    try {
      await deletePtoRecord(username, date);
      fetchStatus();
    } catch (e) { 
      console.error(e); 
      setUserPtos(prev);
    }
  };

  // Status calculation
  let statusWarning = null;
  
  // Live Time Calculation
  const isToday = selectedDate === formatDateDash();
  const isPunchedIn = isToday && rawPunchesForToday.length % 2 !== 0;
  
  // Calculate Target
  const targetSeconds = (data?.target_seconds !== undefined && data?.target_seconds !== null) 
    ? data.target_seconds 
    : (settings?.required_hours || 9) * 3600 - (data?.hours_off || 0) * 3600;

  let displayActualSeconds = 0;
  let displayShortageSeconds = 0;

  if (isToday) {
    // For today, calculate everything from raw punches to ensure immediate feedback
    const completedSeconds = calculatePunchedSeconds(rawPunchesForToday);
    displayActualSeconds = completedSeconds;
    
    if (isPunchedIn && rawPunchesForToday.length > 0) {
      const lastPunch = rawPunchesForToday[0]; // Latest punch
      const sessionStartTime = new Date(lastPunch.created_at);
      const liveSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      if (liveSeconds > 0) {
        displayActualSeconds += liveSeconds;
      }
    }
    displayShortageSeconds = Math.max(0, targetSeconds - displayActualSeconds);
  } else {
    // For historical days, trust the view but allow for "live" if somehow still punched in
    displayActualSeconds = data?.actual_seconds || 0;
    if (data?.shortage_display) {
      const [h, m, s] = data.shortage_display.split(':').map(Number);
      displayShortageSeconds = h * 3600 + m * 60 + s;
    }

    // Still add live seconds if they are somehow punched in (e.g. overnight shift)
    if (isPunchedIn && rawPunchesForToday.length > 0) {
      const lastPunch = rawPunchesForToday[0];
      const sessionStartTime = new Date(lastPunch.created_at);
      const liveSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      if (liveSeconds > 0) {
        displayActualSeconds += liveSeconds;
        displayShortageSeconds = Math.max(0, targetSeconds - displayActualSeconds);
      }
    }
  }

  let displayStart = data?.start_display;
  let displayEnd = data?.end_display;

  if (isToday) {
    if (rawPunchesForToday.length > 0) {
      const firstPunch = rawPunchesForToday[rawPunchesForToday.length - 1];
      const lastPunch = rawPunchesForToday[0];
      
      const formatLocalTime = (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return d.toLocaleTimeString('en-GB', {timeZone: 'Asia/Taipei', hour12: false});
      };
      
      displayStart = formatLocalTime(firstPunch.created_at);
      displayEnd = formatLocalTime(lastPunch.created_at);
    } else {
      displayStart = "--:--:--";
      displayEnd = "--:--:--";
    }
  }

  if (displayStart && displayStart !== "--:--:--" && settings?.shift_start) {
    const punchTime = new Date(`1970-01-01T${displayStart}`);
    const shiftStart = new Date(`1970-01-01T${settings.shift_start}`);
    const diffMinutes = (punchTime.getTime() - shiftStart.getTime()) / 60000;

    if (diffMinutes > 30) {
      statusWarning = { type: 'late', message: t('lateReschedule') };
    } else if (diffMinutes > 0) {
      statusWarning = { type: 'late', message: t('late') };
    } else if (diffMinutes < 0) {
      statusWarning = { type: 'early', message: t('early') };
    }
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-md mx-auto relative">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-[#0A84FF] text-[10px] uppercase font-bold tracking-widest mb-0.5">{t('systemName')}</h3>
          <h1 className="text-xl font-bold tracking-tight text-white">{t('dashboard')}</h1>
        </div>
        <div className="flex gap-2 items-center">
          {/* PTO Button - palm tree */}
          <button onClick={() => setShowPto(true)} className="p-1.5 bg-[#1C1C1E] rounded-full hover:bg-[#2C2C2E] transition-colors text-lg leading-none flex items-center justify-center w-9 h-9">
            🌴
          </button>
          {/* Date Picker as calendar icon */}
          <div className="relative w-9 h-9">
            <button
              className="w-9 h-9 bg-[#1C1C1E] rounded-full hover:bg-[#2C2C2E] transition-colors flex items-center justify-center"
              onClick={() => {
                const picker = document.getElementById('header-date-picker');
                if (picker) picker.click();
              }}
            >
              <Calendar size={18} />
            </button>
            <input
              id="header-date-picker"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          {/* Settings Button */}
          <button onClick={() => setShowSettings(true)} className="p-1.5 bg-[#1C1C1E] rounded-full hover:bg-[#2C2C2E] transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} username={username} onLogout={() => window.location.reload()} />}

      {/* Selected Date - Big Centered Display */}
      <div className="mb-3 text-center">
        <p className="text-2xl font-bold tracking-tight text-white">{selectedDate.replace(/-/g, '/')}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t('punchDate')}</p>
      </div>

      {/* Time Worked Card (Glance Section) */}
      <div className="bg-[#1C1C1E] rounded-3xl p-8 border border-[#2C2C2E] mb-4 flex flex-col items-center justify-center">
        <p className="text-sm text-gray-400 mb-4">{t('timeWorked')}</p>
        
        {/* The main timer */}
        <div className={`text-5xl font-mono font-light tracking-tighter mb-2 tabular-nums ${displayShortageSeconds === 0 && displayActualSeconds > 0 ? 'text-[#34C759]' : 'text-white'}`}>
          {formatSeconds(displayActualSeconds)}
        </div>
        
        {/* The status text below the timer */}
        <p className="text-xs font-medium">
          {displayStart === "--:--:--" 
            ? <span className="text-gray-500">{t('notPunched')}</span> 
            : (displayShortageSeconds === 0 && displayActualSeconds > 0)
              ? <span className="text-[#34C759]">下班！ (Goal Reached)</span>
              : <span className="text-[#FF9F0A]">尚差 {formatSeconds(displayShortageSeconds)}</span>
          }
        </p>

        {/* Status Tags Container */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {data?.hours_off > 0 && (
            <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0A84FF]/20 text-[#0A84FF] flex items-center gap-1">
              <span>🌴</span>
              <span>{t('pto')}: {data.hours_off}hr</span>
            </div>
          )}
          {statusWarning && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusWarning.type === 'late' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-emerald-500/20 text-emerald-500'}`}>
              {statusWarning.message}
            </div>
          )}
        </div>
      </div>

      {/* Daily Details */}
      <div className="bg-[#1C1C1E] rounded-2xl p-3 border border-[#2C2C2E] mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-medium text-gray-400">{t('dailyDetails')}</p>
          <div className="flex gap-2">
            <button onClick={openPunchManager} className="bg-transparent border border-[#2C2C2E] rounded-lg px-3 py-1 text-[10px] hover:bg-[#2C2C2E] transition-colors">
              {t('managePunch')}
            </button>
            <button onClick={() => setShowManual(true)} className="bg-transparent border border-[#2C2C2E] rounded-lg px-3 py-1 text-[10px] hover:bg-[#2C2C2E] transition-colors">
              {t('manualPunch')}
            </button>
          </div>
        </div>
        
        <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2C2C2E] flex flex-col items-center justify-center">
           <div className="grid grid-cols-2 w-full text-center text-[10px] text-gray-500 mb-2">
             <span>{t('start')}</span>
             <span>{t('end')}</span>
           </div>
           {displayStart && displayStart !== "--:--:--" ? (
             <div className="grid grid-cols-2 w-full text-center font-mono text-base">
                <span>{formatTime(displayStart)}</span>
                <span>{displayEnd === displayStart ? "" : (displayShortageSeconds === 0 ? formatTime(displayEnd) : "--:--:--")}</span>
             </div>
           ) : (
             <p className="text-gray-500 text-xs">{t('noPunchTime')}</p>
           )}
        </div>
      </div>

      {/* Punch Button — at the bottom */}
      <button 
        onClick={() => handlePunch()} 
        onMouseEnter={() => fetchStatus()}
        className="bg-[#0A84FF] hover:bg-blue-600 active:scale-95 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-1 w-full mb-2"
      >
        <Fingerprint size={28} className="text-white" />
        <span className="text-white font-bold text-base">{t('punch')}</span>
      </button>

      {/* MODAL: Manual Punch Picker */}
      {showManual && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowManual(false)}
        >
          <div 
            className="bg-[#1C1C1E] w-full max-w-sm rounded-[32px] p-6 border border-[#2C2C2E] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-6 text-center">{t('manualPunch')}</h3>
            <p className="text-sm text-gray-400 mb-4 text-center">{selectedDate}</p>
            <TimePicker value={manualTime} onChange={setManualTime} />
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setShowManual(false)} className="bg-transparent border border-[#2C2C2E] py-4 rounded-2xl font-medium">{t('cancel')}</button>
              <button onClick={submitManualPunch} className="bg-[#0A84FF] py-4 rounded-2xl font-medium">{t('confirm')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Manage/Clear Punches */}
      {showClearModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowClearModal(false)}
        >
          <div 
            className="bg-[#1C1C1E] w-full max-w-sm h-[500px] flex flex-col rounded-[32px] p-6 border border-[#2C2C2E] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 flex-none">
              <h3 className="text-xl font-bold">{t('managePunches')}</h3>
              <button onClick={() => setShowClearModal(false)} className="bg-[#2C2C2E] p-2 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4 flex-none">{formatDate(selectedDate)} {t('punchList')}</p>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {rawPunchesForToday.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('noPunchTime')}</p>
              ) : (
                rawPunchesForToday.map(p => {
                  const localTime = formatTime(p.created_at);
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-[#0A0A0A] p-4 rounded-2xl border border-white/5">
                      <span className="font-mono text-lg">{localTime} <span className="text-xs text-gray-500 ml-2">{p.is_manual ? t('manualTag') : ''}</span></span>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: p.id })} className="p-2 bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: PTO Input */}
      {showPto && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
          onClick={() => setShowPto(false)}
        >
          <div 
            className="bg-[#1C1C1E] p-8 rounded-[32px] border border-[#2C2C2E] w-full max-w-sm animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{t('ptoHours')}</h2>
              <button 
                onClick={() => { setShowPto(false); openPtoManager(); }}
                className="text-[#0A84FF] text-xs font-medium hover:underline"
              >
                {t('managePto')}
              </button>
            </div>
            <form onSubmit={handlePto} className="space-y-4">
              <div className="w-full">
                <DatePicker value={selectedDate} onChange={setSelectedDate} />
              </div>
              <input type="hidden" name="date" value={selectedDate} />
              <input type="number" name="hours" min="0.5" max="9" step="0.5" required className="w-full bg-[#0A0A0A] p-4 rounded-2xl border border-[#2C2C2E] text-white outline-none focus:border-[#0A84FF]" placeholder={t('hours')} />
              <button type="submit" className="w-full bg-[#0A84FF] text-white py-4 rounded-2xl font-medium">{t('submit')}</button>
              <button type="button" onClick={() => setShowPto(false)} className="w-full py-3 text-gray-500 hover:text-white">{t('cancel')}</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Manage PTO */}
      {showManagePto && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowManagePto(false)}
        >
          <div 
            className="bg-[#1C1C1E] w-full max-w-sm h-[500px] flex flex-col rounded-[32px] p-6 border border-[#2C2C2E] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 flex-none">
              <h3 className="text-xl font-bold">{t('managePto')}</h3>
              <button onClick={() => setShowManagePto(false)} className="bg-[#2C2C2E] p-2 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4 flex-none">{t('ptoList')}</p>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {userPtos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('noPunchTime')}</p>
              ) : (
                userPtos.map(p => (
                  <div key={p.pto_date} className="flex justify-between items-center bg-[#0A0A0A] p-4 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="font-mono text-lg">{formatDate(p.pto_date)}</span>
                      <span className="text-xs text-gray-500">{p.hours_off} {t('hours')}</span>
                    </div>
                    <button onClick={() => setConfirmDeletePto({ isOpen: true, date: p.pto_date })} className="p-2 bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => confirmDelete.id && handleDeletePunch(confirmDelete.id)}
        message={t('deleteConfirm')}
      />

      <ConfirmModal 
        isOpen={confirmDeletePto.isOpen}
        onClose={() => setConfirmDeletePto({ isOpen: false, date: null })}
        onConfirm={() => confirmDeletePto.date && handleDeletePto(confirmDeletePto.date)}
        message={t('deleteConfirm')}
      />
    </div>
  );
}
