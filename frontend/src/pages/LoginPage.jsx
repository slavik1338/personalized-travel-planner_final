import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 


const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

function LoginPage({ onLoginSuccess }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const loginData = { email, password };

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.detail || `Ошибка авторизации: ${response.status}`);
        console.error("Login failed:", responseData);
      } else {
        console.log("Login successful:", responseData);
        const loggedInUserId = responseData.user_id;
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUserId', loggedInUserId);
        onLoginSuccess(loggedInUserId);
        navigate('/');
      }

    } catch (err) {
      
      setError(`Network error: ${err.message}`);
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: 'auto', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
      <h2>Авторизация</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'red', marginTop: '15px' }}> Неверный логин или пароль </p>
      )}

      <p style={{ marginTop: '20px' }}>
        Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}

export default LoginPage;