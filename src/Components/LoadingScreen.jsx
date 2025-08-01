import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <div className="loading-message">{message}</div>
  </div>
);

export default LoadingScreen; 