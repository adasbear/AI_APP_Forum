import React, { createContext, useContext, useState, useCallback } from 'react';

// Toast context to manage toast notifications globally.
const ToastContext = createContext(undefined);

/**
 * ToastProvider component that holds toast state and provides helper to add toasts.
 * Toast objects: { id, type: 'success' | 'error' | 'info', message, duration }
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 3000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const value = { addToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}> {t.message} </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to use the toast context */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
