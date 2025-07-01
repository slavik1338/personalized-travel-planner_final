import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';


const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

function HistoryPage() {
  const [historyData, setHistoryData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoryData = async () => {
      setIsLoading(true);
      setError(null);
      const userId = getCurrentUserId(); 

      if (userId === null) {
          setError("User ID not available. Please log in.");
          setIsLoading(false);
          return;
      }

      try {
        const headers = { 'X-User-ID': userId.toString() };
        const response = await fetch(`${API_BASE_URL}/queries/history/${userId}`, {
          method: 'GET',
          headers: headers,
        });
        const responseData = await response.json();

        if (!response.ok) {
          setError(responseData.detail || `Error loading history: ${response.status}`);
        } else {
          setHistoryData(responseData);
        }
      } catch (err) {
        setError(`Network error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, []); 

  if (isLoading) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-medium)' }}>Загрузка истории...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--pastel-danger, #c0392b)' }}>Ошибка: {error}</div>;
  }

  return (
    <div style={{ 
        padding: '30px 20px' 
    }}>
        <div style={{
            backgroundColor: 'var(--background-main-content, #ffffff)',
            maxWidth: '900px', 
            margin: '0 auto',
            padding: '30px', 
            borderRadius: 'var(--border-radius-lg, 16px)', 
            boxShadow: 'var(--box-shadow-medium, 0 6px 12px rgba(0, 0, 0, 0.08))',
            border: '1px solid var(--border-color, #e2e8f0)'
        }}>
            <h2 style={{ 
                textAlign: 'center', 
                marginTop: 0, 
                marginBottom: '30px', 
                color: 'var(--text-dark)', 
                fontFamily: 'var(--font-heading, "Montserrat", sans-serif)',
                fontSize: '1.8em',
                paddingBottom: '15px',
                borderBottom: '1px solid var(--border-color, #e2e8f0)'
            }}>
                История Ваших Маршрутов
            </h2>

            {!historyData || historyData.length === 0 ? (
                 <p style={{ textAlign: 'center', color: 'var(--text-medium)', padding: '30px 0', fontSize: '1.1em' }}>
                    Ваша история запросов пока пуста.
                 </p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {historyData.map((queryItem, index) => (
                        <React.Fragment key={queryItem.id}>
                            <li style={{ 
                                padding: '25px 0', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                flexWrap: 'wrap', 
                                gap: '15px' 
                            }}>
                                <div style={{ flexGrow: 1, marginRight: '20px', minWidth: '300px' }}>
                                    <p style={{ 
                                        margin: '0 0 10px 0', 
                                        fontWeight: '500', 
                                        fontSize: '1.15em', 
                                        color: 'var(--text-dark)' 
                                    }}>
                                        Запрос: <span style={{fontWeight: 'normal'}}>"{queryItem.query_text}"</span>
                                    </p>
                                    
                                    {queryItem.parameters && typeof queryItem.parameters === 'object' && (
                                       <div style={{ fontSize: '0.9em', color: 'var(--text-medium)', lineHeight: '1.6' }}>
                                           {queryItem.parameters.start_date && queryItem.parameters.end_date && (
                                               <p style={{ margin: '0 0 4px 0' }}><strong>Даты:</strong> {queryItem.parameters.start_date} - {queryItem.parameters.end_date}</p>
                                           )}
                                           {queryItem.parameters.budget !== null && queryItem.parameters.budget !== undefined && ( 
                                               <p style={{ margin: '0 0 4px 0' }}><strong>Бюджет:</strong> {queryItem.parameters.budget} {queryItem.parameters.budget_currency || ''}</p>
                                           )}
                                           {queryItem.parameters.destination && queryItem.parameters.destination.length > 0 && (
                                                <p style={{ margin: '0 0 4px 0' }}><strong>Направление:</strong> {queryItem.parameters.destination.join(', ')}</p>
                                           )}
                                           {queryItem.parameters.interests && queryItem.parameters.interests.length > 0 && (
                                               <p style={{ margin: '0 0 4px 0' }}><strong>Интересы:</strong> {queryItem.parameters.interests.join('; ')}</p>
                                           )}
                                           {queryItem.parameters.travel_style && (
                                                <p style={{ margin: '0 0 4px 0' }}><strong>Стиль:</strong> {queryItem.parameters.travel_style}</p>
                                           )}
                                           {queryItem.parameters.hasOwnProperty('route_id') && parseInt(queryItem.parameters.route_id, 10) > 0 && (
                                               <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: 'var(--pastel-success, #28a745)' }}>
                                                  ✓ Маршрут сгенерирован (ID: {queryItem.parameters.route_id})
                                               </p>
                                           )}
                                       </div>
                                    )}
                                    <p style={{ margin: '15px 0 0 0', fontSize: '0.8em', color: 'var(--text-medium)' }}>
                                        Создан: {new Date(queryItem.created_at).toLocaleString()}
                                    </p>
                                </div>
                                
                                {queryItem.parameters && typeof queryItem.parameters === 'object' && queryItem.parameters.hasOwnProperty('route_id') && parseInt(queryItem.parameters.route_id, 10) > 0 && (
                                     <div style={{ flexShrink: 0 }}> 
                                         <Link to={`/routes/${queryItem.parameters.route_id}`} style={{ textDecoration: 'none' }}>
                                             <button style={{ 
                                                 padding: '10px 18px', 
                                                 backgroundColor: 'var(--pastel-primary, #a7c7e7)', 
                                                 color: 'var(--text-on-pastel-primary, #2c3e50)', 
                                                 border: 'none', 
                                                 borderRadius: 'var(--border-radius-sm, 6px)', 
                                                 cursor: 'pointer',
                                                 fontSize: '0.95em',
                                                 fontWeight: '500',
                                                 boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
                                                 transition: 'background-color 0.2s ease',
                                             }}
                                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--pastel-primary-darker, #8aabbf)'} 
                                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--pastel-primary, #a7c7e7)'}
                                             >
                                                 Посмотреть маршрут
                                             </button>
                                         </Link>
                                     </div>
                                )}
                            </li>
                            
                            {index < historyData.length - 1 && (
                                <div style={{
                                    height: '1px',
                                    backgroundColor: 'var(--border-color, #e2e8f0)',
                                    
                                }}></div>
                            )}
                        </React.Fragment>
                    ))}
                </ul>
            )}
        </div>
    </div>
  );
}

export default HistoryPage;