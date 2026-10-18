import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-modal border bg-surface
                ${t.type === 'success' ? 'border-success-light' : t.type === 'error' ? 'border-error-light' : 'border-border'}`}
            >
              <div className={`mt-0.5 ${t.type === 'success' ? 'text-success' : t.type === 'error' ? 'text-error' : 'text-primary'}`}>
                {t.type === 'success' ? <CheckCircle className="w-5 h-5" /> : t.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <p className="flex-1 text-[14px] text-textPrimary">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="text-textSecondary hover:text-textPrimary"><X className="w-4 h-4" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
