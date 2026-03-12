// Trigger re-compile to fix manifest error
'use client';

import { useState, useEffect } from 'react';
import { Home, History } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { HistoryList } from '@/components/HistoryList';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const saved = localStorage.getItem('punch_username');
    if (saved && !isLoggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername(saved);
      setIsLoggedIn(true);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    console.log('MainApp updated, isLoggedIn:', isLoggedIn);
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('punch_username');
    setUsername('');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-6">
        <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('punch_username', username); setIsLoggedIn(true); }} 
              className="w-full max-w-sm bg-[#1C1C1E] p-8 rounded-[32px] border border-[#2C2C2E]">
          <h1 className="text-2xl font-bold mb-2 text-center">{t('loginTitle')}</h1>
          <p className="text-gray-400 text-center mb-8 text-sm">{t('loginSubtitle')}</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-2xl p-4 mb-6 text-white focus:outline-none focus:border-[#0A84FF]"
            placeholder="Username"
            required
          />
          <button type="submit" className="w-full bg-[#0A84FF] text-white font-medium py-4 rounded-2xl hover:bg-blue-600 transition-colors">
            {t('enterSystem')}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="h-screen bg-[#000000] text-white font-sans overflow-hidden flex flex-col relative">
      
      {/* Scrollable Main Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-2 pb-32">
          {activeTab === 'home' ? <Dashboard username={username} onLogout={handleLogout} /> : <HistoryList username={username} />}
        </div>
      </main>

      {/* Floating Action Bar (Like the screenshot bottom nav) */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
        <nav className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-[#2C2C2E] rounded-[24px] flex items-center justify-around w-full max-w-md p-2 shadow-2xl shadow-black/50 pointer-events-auto">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] transition-all ${activeTab === 'home' ? 'bg-[#2C2C2E] text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Home size={20} />
            <span className="text-sm font-medium">{t('home')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] transition-all ${activeTab === 'history' ? 'bg-[#2C2C2E] text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <History size={20} />
            <span className="text-sm font-medium">{t('history')}</span>
          </button>
        </nav>
      </div>
      
    </div>
  );
}

export default function Page() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}