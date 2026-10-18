import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Select({ label, options = [], value, onChange, placeholder = 'Select...', error, className = '', containerClassName = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={`space-y-1.5 relative ${containerClassName}`} ref={ref}>
      {label && <label className="block text-[13px] font-medium text-textPrimary">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-10 px-3 rounded-lg border bg-surface text-[14px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all
          ${error ? 'border-error' : 'border-border'} ${className}`}
      >
        <span className={selected ? 'text-textPrimary' : 'text-textSecondary'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-modal max-h-60 overflow-auto"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-[14px] flex items-center justify-between hover:bg-appBg transition-colors ${value === opt.value ? 'bg-primary-light text-primary' : 'text-textPrimary'}`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
