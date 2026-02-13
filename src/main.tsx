import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';

// Suppress non-critical ERR_ABORTED warnings from Electron webview
window.addEventListener('error', (event) => {
  const message = event.message || event.error?.message || '';
  if (message.includes('ERR_ABORTED') || 
      message.includes('GUEST_VIEW_MANAGER_CALL') ||
      message.includes('Error invoking remote method')) {
    event.preventDefault();
    return;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason);
  if (message.includes('ERR_ABORTED') || 
      message.includes('GUEST_VIEW_MANAGER_CALL') ||
      message.includes('Error invoking remote method')) {
    event.preventDefault();
    return;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(<App />);
