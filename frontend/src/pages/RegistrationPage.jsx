import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';


const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';


function RegistrationPage({ onRegistrationSuccess }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null); 

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      setIsLoading(false);
      return;
    }

    const registrationData = { email, password }; 

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.detail || `Ошибка регистрации: ${response.status}`);
        console.error("Registration failed:", responseData);
      } else {
        console.log("Registration successful:", responseData);
        setSuccessMessage("Регистрация прошла успешно! Теперь вы можете войти.");
        setTimeout(() => navigate('/login')); 

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
      <h2>Регистрация</h2>
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
         <input
          type="password"
          placeholder="Повторите пароль"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>
      )}

       {successMessage && (
        <p style={{ color: 'green', marginTop: '15px' }}>{successMessage}</p>
      )}

      <p style={{ marginTop: '20px' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}

export default RegistrationPage;