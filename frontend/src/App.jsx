import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Добавляем Navigate для перенаправления

// Импорты компонентов Header и страниц
import Header from './components/Header'; // TODO: Скрыть Header на страницах Login/Register
import HomePage from './pages/HomePage'; // Компонент с диалогом
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
  // Состояние авторизации
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated()); // Инициализация из Local Storage

  // Функции для обновления состояния авторизации
  const handleLoginSuccess = (userId) => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUserId', userId); // Установить флаг в Local Storage
      setIsLoggedIn(true); // Обновить состояние
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

        {/* Условно отображаем Header только если пользователь авторизован */}
        {isLoggedIn ? <Header /> : null}

        {/* Область для отображения текущей страницы */}
        <main style={{ flexGrow: 1, padding: isLoggedIn ? '0 20px' : '0', boxSizing: 'border-box' }}> {/* Добавляем падинги только если Header виден */}
          <Routes>
            {/* Маршрут для страницы авторизации */}
            {/* Если пользователь авторизован и пытается зайти на /login, перенаправляем его на главную */}
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />

            {/* Маршрут для страницы регистрации */}
            {/* Если пользователь авторизован и пытается зайти на /register, перенаправляем его на главную */}
            <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <RegistrationPage onRegistrationSuccess={handleRegistrationSuccess} />} />


            {/* Защищенные маршруты (доступны только авторизованным пользователям) */}
            {/* Если пользователь не авторизован, перенаправляем на страницу авторизации */}
            <Route path="/" element={isLoggedIn ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={isLoggedIn ? <ProfilePage onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/recommendations" element={isLoggedIn ? <Recommendations /> : <Navigate to="/login" />} />
            <Route path="/history" element={isLoggedIn ? <HistoryPage /> : <Navigate to="/login" />} />
            <Route path="/reviews" element={isLoggedIn ? <Reviews /> : <Navigate to="/login" />} />
            <Route path="/routes/:route_id" element={isLoggedIn ? <RouteDetailsPage /> : <Navigate to="/login" />} />

            {/* TODO: Add a Catch-all route for 404 */}
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;