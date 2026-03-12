'use client';

import { Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface HistoryItemProps {
  date: string;
  start: string;
  end: string;
  shortage: string;
  onDelete?: () => void;
}

export function HistoryItem({ date, start, end, shortage, onDelete }: HistoryItemProps) {
  const { t } = useLanguage();
  const isComplete = shortage === '00:00:00';
  
  return (
    <div className="bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[24px] p-6 border border-white/5 flex flex-col gap-4 hover:bg-[#2C2C2E]/80 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="font-medium text-xl">{date}</div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isComplete ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
          <Clock size={18} />
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-[#8E8E93] font-mono bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
        <span className="flex-1 text-center">{start}</span>
        <ArrowRight size={14} className="opacity-50" />
        <span className="flex-1 text-center">{end}</span>
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[#8E8E93] uppercase tracking-wider">{t('remaining')}</span>
        <span className={`font-mono font-medium ${isComplete ? 'text-emerald-500' : 'text-orange-500'}`}>
          {shortage}
        </span>
      </div>
    </div>
  );
}
