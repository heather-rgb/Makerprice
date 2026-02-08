import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-body">
      <div className="absolute inset-0 bg-brand-charcoal/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-brand-beige flex items-center justify-between bg-brand-beige/30 font-heading">
          <h3 className="text-xl font-black text-brand-heading uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-brand-earth/20 flex items-center justify-center text-brand-muted hover:text-brand-clay hover:border-brand-clay transition-all">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="p-8 overflow-y-auto leading-relaxed text-brand-body/80 space-y-6">
          {children}
        </div>
        <div className="p-6 border-t border-brand-beige bg-brand-beige/30 flex justify-end font-heading">
          <button onClick={onClose} className="px-8 py-3 bg-brand-charcoal text-brand-beige font-black rounded-xl hover:bg-brand-charcoal/90 transition-all">
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};