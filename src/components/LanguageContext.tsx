

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'zh-TW' | 'en';

interface Translations {
  [key: string]: { 'zh-TW': string; 'en': string; };
}

export const translations: Translations = {
  systemName: { 'zh-TW': '手機打卡系統', 'en': 'Mobile Punch System' },
  dashboard: { 'zh-TW': '打卡紀錄', 'en': 'Punch Records' },
  punchDate: { 'zh-TW': '打卡日期', 'en': 'Punch Date' },
  selectDate: { 'zh-TW': '選擇日期', 'en': 'Select Date' },
  punchIn: { 'zh-TW': '上班打卡', 'en': 'Punch In' },
  punchOut: { 'zh-TW': '下班打卡', 'en': 'Punch Out' },
  timeWorked: { 'zh-TW': '已上班時間', 'en': 'Time Worked' },
  notPunched: { 'zh-TW': '尚未上班打卡', 'en': 'Not Punched In Yet' },
  dailyDetails: { 'zh-TW': '每日打卡時間', 'en': 'Daily Punch Times' },
  managePunch: { 'zh-TW': '管理打卡紀錄', 'en': 'Manage Punch' },
  manualPunch: { 'zh-TW': '補卡', 'en': 'Manual Punch' },
  start: { 'zh-TW': '上班', 'en': 'Start' },
  end: { 'zh-TW': '下班', 'en': 'End' },
  noPunchTime: { 'zh-TW': '尚無打卡時間', 'en': 'No Punch Times Yet' },
  historyStat: { 'zh-TW': '打卡統計', 'en': 'Punch Stats' },
  history: { 'zh-TW': '歷史紀錄', 'en': 'History' },
  month: { 'zh-TW': '月份', 'en': 'Month' },
  overview: { 'zh-TW': '總覽', 'en': 'Overview' },
  daysPunched: { 'zh-TW': '有打卡紀錄天數', 'en': 'Days Punched' },
  daysComplete: { 'zh-TW': '完整上下班天數', 'en': 'Complete Days' },
  totalHours: { 'zh-TW': '完整天數總工時', 'en': 'Total Hours' },
  daysShort: { 'zh-TW': '未滿工時天數', 'en': 'Days Short' },
  accumulatedShortage: { 'zh-TW': '這月累積時差', 'en': 'Monthly Accumulated Shortage' },
  shortList: { 'zh-TW': '未滿工時清單 (完整上下班)', 'en': 'Shortage List (Complete Punches)' },
  dailyRecord: { 'zh-TW': '單日紀錄', 'en': 'Daily Record' },
  workHours: { 'zh-TW': '工時', 'en': 'Hours Worked' },
  shortage: { 'zh-TW': '尚差', 'en': 'Shortage' },
  delete: { 'zh-TW': '刪除', 'en': 'Delete' },
  home: { 'zh-TW': '首頁', 'en': 'Home' },
  loginTitle: { 'zh-TW': '打卡系統', 'en': 'Punch System' },
  loginSubtitle: { 'zh-TW': '請輸入您的使用者名稱', 'en': 'Enter Username' },
  enterSystem: { 'zh-TW': '進入系統', 'en': 'Enter' },
  shortageWarning: { 'zh-TW': '尚需工作時間 (尚差 {shortage})', 'en': 'Remaining Time (Shortage: {shortage})' },
  monthOption: { 'zh-TW': '{year}年{month}月', 'en': '{year}-{month}' },
  settings: { 'zh-TW': '設定', 'en': 'Settings' },
  language: { 'zh-TW': '語言', 'en': 'Language' },
  pto: { 'zh-TW': '請假', 'en': 'PTO' },
  ptoHours: { 'zh-TW': '請假 (小時)', 'en': 'PTO (Hours)' },
  remainingTime: { 'zh-TW': '尚需工作時間', 'en': 'Remaining Time' },
  managePto: { 'zh-TW': '管理請假紀錄', 'en': 'Manage PTO' },
  ptoList: { 'zh-TW': '請假清單', 'en': 'PTO List' },
  cancel: { 'zh-TW': '取消', 'en': 'Cancel' },
  submit: { 'zh-TW': '送出', 'en': 'Submit' },
  hours: { 'zh-TW': '時數', 'en': 'Hours' },
  punch: { 'zh-TW': '打卡', 'en': 'Punch' },
  managePunches: { 'zh-TW': '管理打卡紀錄', 'en': 'Manage Punches' },
  deleteConfirm: { 'zh-TW': '確定要刪除此筆打卡紀錄嗎？', 'en': 'Are you sure you want to delete this punch record?' },
  confirm: { 'zh-TW': '確認', 'en': 'Confirm' },
  punchList: { 'zh-TW': '打卡清單', 'en': 'Punch List' },
  manualTag: { 'zh-TW': '(補)', 'en': '(Manual)' },
  workSchedule: { 'zh-TW': '工作排班', 'en': 'Work Schedule' },
  early: { 'zh-TW': '早到!', 'en': 'Early!' },
  late: { 'zh-TW': '遲到!', 'en': 'Late!' },
  lateReschedule: { 'zh-TW': '遲到! 應調整至下一班次', 'en': 'Late! Should reschedule to next shift.' }
};

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('zh-TW');

  useEffect(() => {
    const saved = localStorage.getItem('punch_lang') as Language;
    if ((saved === 'en' || saved === 'zh-TW') && saved !== lang) {
      setLang(saved); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [lang]);

  const toggleLang = () => {
    const newLang = lang === 'zh-TW' ? 'en' : 'zh-TW';
    setLang(newLang);
    localStorage.setItem('punch_lang', newLang);
  };

  const t = (key: keyof typeof translations): string => translations[key]?.[lang] || String(key);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}