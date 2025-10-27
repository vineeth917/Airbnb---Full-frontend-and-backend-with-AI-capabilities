import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';

// Router wrapper that adds URL-based routing to the existing App
function RouterWrapper() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect old auth URLs to root */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        
        {/* Main app routes - App.jsx will handle internal routing based on currentView */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

export default RouterWrapper;

