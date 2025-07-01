import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Header() {
  const headerStyle = {
    backgroundColor: 'var(--pastel-primary, #a7c7e7)', 
    padding: '15px 0', 
    color: 'var(--text-on-pastel-primary, #2c3e50)',
    boxShadow: 'var(--box-shadow-soft, 0 2px 5px rgba(0, 0, 0, 0.06))',
    width: '100%', 
    boxSizing: 'border-box',
    
  };

  
  
  const headerContentStyle = {
    maxWidth: '1280px', 
    margin: '0 auto',   
    padding: '0 2rem',  
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.9em',
    fontFamily: "var(--font-heading, 'Montserrat', sans-serif)",
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: 'var(--text-on-pastel-primary, #2c3e50)',
  };

  const navStyle = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    gap: '30px',
  };

  const getLinkStyle = ({ isActive }) => ({
    color: 'var(--text-on-pastel-primary, #2c3e50)',
    textDecoration: 'none',
    fontSize: '1.05em',
    fontFamily: "var(--font-primary, 'Roboto', sans-serif)",
    fontWeight: isActive ? 'bold' : 'normal',
    padding: '8px 0',
    position: 'relative',
    opacity: isActive ? 1 : 0.8,
    borderBottom: isActive ? `3px solid var(--pastel-secondary, #fdd7aa)` : '3px solid transparent',
    transition: 'opacity 0.2s ease-in-out, border-bottom-color 0.2s ease-in-out',
  });

  return (
    <header style={headerStyle}>
      <div style={headerContentStyle}> 
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={titleStyle}>TravelPlanner</h1>
        </Link>

        <nav>
          <ul style={navStyle}>
            <li>
              <NavLink to="/" style={getLinkStyle} end>
                Диалог
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" style={getLinkStyle}>
                Профиль
              </NavLink>
            </li>
            <li>
              <NavLink to="/recommendations" style={getLinkStyle}>
                Рекомендации
              </NavLink>
            </li>
            <li>
              <NavLink to="/history" style={getLinkStyle}>
                История
              </NavLink>
            </li>
            <li>
              <NavLink to="/reviews" style={getLinkStyle}>
                Отзывы
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;