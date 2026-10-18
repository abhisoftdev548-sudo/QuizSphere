import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', variant = 'default', closeOnBackdrop = true, closeOnEsc = true }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && closeOnEsc) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnEsc]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${sizes[size]} bg-surface rounded-2xl shadow-modal overflow-hidden outline-none`}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-[18px] font-semibold text-textPrimary">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-appBg text-textSecondary hover:text-textPrimary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="px-6 py-5 max-h-[70vh] overflow-auto">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-border bg-appBg/50 flex items-center justify-end gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Are you sure?', description = 'This action cannot be undone.', confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-[14px] text-textSecondary">{description}</p>
    </Modal>
  );
}
