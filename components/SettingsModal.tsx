'use client';

import { useLanguage } from './LanguageContext';
import { createPortal } from 'react-dom';
import { X, Globe, LogOut, User, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateShiftSettings } from '@/lib/api';

interface SettingsModalProps {
  onClose: () => void;
  username: string;
  onLogout: () => void;
}

export function SettingsModal({ onClose, username, onLogout }: SettingsModalProps) {
  const { t, toggleLang, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [currentShift, setCurrentShift] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const loadSettings = async () => {
      const { data } = await supabase.from('user_settings').select('shift_start').eq('username', username).maybeSingle();
      if (data?.shift_start) {
        const start = data.shift_start.substring(0, 5).replace(':', '');
        setCurrentShift(start);
      }
    };
    loadSettings();
    return () => setMounted(false);
  }, [username]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('punch_username');
    onLogout();
  };

  const handleShiftChange = async (shift: '0900' | '0930' | '1000' | '1300') => {
    await updateShiftSettings(username, shift);
    setCurrentShift(shift);
    // alert('Shift updated');
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div 
        className="bg-[#1C1C1E] p-8 rounded-[32px] border border-[#2C2C2E] w-full max-w-sm animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('settings')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0A0A0A] border border-[#2C2C2E]">
            <User size={20} className="text-gray-400" />
            <span className="font-medium">{username}</span>
          </div>

          <div className="px-4 py-3 rounded-2xl bg-[#0A0A0A] border border-[#2C2C2E]">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={20} className="text-gray-400" />
              <span className="font-medium">{t('workSchedule')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['0900', '0930', '1000', '1300'] as const).map(shift => (
                <button 
                  key={shift} 
                  onClick={() => handleShiftChange(shift)} 
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-all border ${currentShift === shift ? 'bg-[#0A84FF] text-white border-[#0A84FF]' : 'bg-[#2C2C2E] text-gray-300 border-transparent hover:border-[#0A84FF]'}`}
                >
                  {shift === '0900' ? '09:00-18:00' : shift === '0930' ? '09:30-18:30' : shift === '1000' ? '10:00-19:00' : '13:00-22:00'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={toggleLang} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#0A0A0A] border border-[#2C2C2E] hover:border-[#0A84FF] transition-all">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-gray-400" />
              <span className="font-medium">{t('language')}</span>
            </div>
            <span className="text-xs font-bold bg-[#2C2C2E] px-2 py-1 rounded-md">{lang === 'zh-TW' ? 'EN' : '中文'}</span>
          </button>

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/20 transition-all">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
