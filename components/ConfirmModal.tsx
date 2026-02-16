
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  type?: 'danger' | 'success' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, confirmText = "Conferma", type = 'warning' 
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: "bg-red-500 hover:bg-red-600 shadow-red-200",
    success: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200",
    warning: "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
  };

  const iconColors = {
    danger: "text-red-500 bg-red-50 dark:bg-red-900/20",
    success: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    warning: "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${iconColors[type]}`}>
            <AlertTriangle size={40} />
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-center mb-2 dark:text-white leading-tight">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 font-medium px-2">
          {message}
        </p>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            Annulla
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-4 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
