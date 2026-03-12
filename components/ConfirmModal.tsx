'use client';

import { X, AlertTriangle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-[#1C1C1E] w-full max-w-xs rounded-[32px] p-6 border border-[#2C2C2E] animate-in zoom-in-95 duration-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-[#FF3B30]" size={24} />
          </div>
          
          <h3 className="text-lg font-bold mb-2 text-white">{title || t('confirm')}</h3>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            {message}
          </p>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={onClose}
              className="bg-[#2C2C2E] text-white py-3 rounded-2xl font-medium text-sm transition-colors hover:bg-[#3C3C3E]"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="bg-[#FF3B30] text-white py-3 rounded-2xl font-medium text-sm transition-colors hover:bg-red-600"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
