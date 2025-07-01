import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 


import Header from './components/Header';
import HomePage from './pages/HomePage'; 
import ProfilePage from './pages/ProfilePage';
import Recommendations from './pages/Recommendations';
import HistoryPage from './pages/HistoryPage'; 
import Reviews from './pages/Reviews';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import RouteDetailsPage from './pages/RouteDetailsPage';
import './App.css';


const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

const isAuthenticated = () => {
    return localStorage.getItem('isLoggedIn') === 'true';
};


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());

  const handleLoginSuccess = (userId) => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUserId', userId); 
      setIsLoggedIn(true); 
  };

  const handleRegistrationSuccess = () => {
      console.log("Registration handled in App");
  };

  const handleLogout = () => {
      localStorage.setItem('isLoggedIn', 'false');
      localStorage.removeItem('currentUserId');
      setIsLoggedIn(false);
  };


  return (
    <BrowserRouter>
      <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {isLoggedIn ? <Header /> : null}


        <main style={{ flexGrow: 1, padding: isLoggedIn ? '0 20px' : '0', boxSizing: 'border-box' }}> 
          <Routes>
            
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <RegistrationPage onRegistrationSuccess={handleRegistrationSuccess} />} />

            <Route path="/" element={isLoggedIn ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={isLoggedIn ? <ProfilePage onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/recommendations" element={isLoggedIn ? <Recommendations /> : <Navigate to="/login" />} />
            <Route path="/history" element={isLoggedIn ? <HistoryPage /> : <Navigate to="/login" />} />
            <Route path="/reviews" element={isLoggedIn ? <Reviews /> : <Navigate to="/login" />} />
            <Route path="/routes/:route_id" element={isLoggedIn ? <RouteDetailsPage /> : <Navigate to="/login" />} />

          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;