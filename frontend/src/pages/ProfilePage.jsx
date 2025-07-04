import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

const getAuthToken = () => {
    return null;
};

const AVAILABLE_INTERESTS = [
    "активность", "архитектура", "винный туризм", "еда", "животные",
    "искусство", "история", "культура", "музей", "музыка",
    "ночная жизнь", "парк", "пляж", "походы", "природа",
    "релакс", "религия", "спорт", "фотография", "шопинг"
];

const AVAILABLE_TRAVEL_STYLES = [
    "активный", "бюджетный", "гастрономический", "горный туризм",
    "историко-архитектурный", "комфортный", "культурный", "люкс",
    "медицинский туризм", "одиночное путешествие", "пляжный отдых",
    "приключенческий", "релаксационный", "романтическое путешествие",
    "семейный отдых", "спокойный", "тур по фестивалям", "фототур",
    "эко-туризм", "экстремальный туризм"
];


const AVAILABLE_CURRENCIES = ['RUB', 'USD', 'EUR'];


function ProfilePage({ onLogout }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editedInterests, setEditedInterests] = useState([]);
  const [editedTravelStyle, setEditedTravelStyle] = useState(''); 
  const [editedBudget, setEditedBudget] = useState('');
  const [editedBudgetCurrency, setEditedBudgetCurrency] = useState('RUB');

  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);


  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      const userId = getCurrentUserId();

      if (userId === null) {
          setError("User ID not available. Please log in.");
          setIsLoading(false);
          return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/profile/${userId}`, {
          method: 'GET',
        });

        const responseData = await response.json();

        if (!response.ok) {
          setError(responseData.detail || `Error loading profile: ${response.status}`);
          console.error("Failed to load profile:", responseData);
        } else {
          setUserData(responseData);
          setEditedInterests(responseData.interests ? responseData.interests.split(';') : []);
          setEditedTravelStyle(responseData.travel_style || ''); 
          setEditedBudget(responseData.budget !== null ? responseData.budget.toString() : '');
          setEditedBudgetCurrency(responseData.budget_currency || 'RUB');
        }

      } catch (err) {
        setError(`Network error: ${err.message}`);
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []); 


  const handleSave = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      const userId = getCurrentUserId();
      if (userId === null) {
          setError("User ID not available for saving.");
          setIsLoading(false);
          return;
      }

      const dataToUpdate = {
          interests: editedInterests.join(';'), 
          travel_style: editedTravelStyle, 
          budget: editedBudget === '' ? null : parseFloat(editedBudget), 
          budget_currency: editedBudgetCurrency, 
      };

      try {
        const response = await fetch(`${API_BASE_URL}/users/profile/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToUpdate),
        });

        const responseData = await response.json();

        if (!response.ok) {
          setError(responseData.detail || `Error saving profile: ${response.status}`);
        } else {
          setUserData(responseData);
          setEditedInterests(responseData.interests ? responseData.interests.split(';') : []);
          setEditedTravelStyle(responseData.travel_style || ''); 
          setEditedBudget(responseData.budget !== null && responseData.budget !== undefined ? responseData.budget.toString() : ''); 
          setEditedBudgetCurrency(responseData.budget_currency || 'RUB'); 
          setIsEditing(false);
        }

      } catch (err) {
        setError(`Network error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
  };

  const handleCancelEdit = () => {
      setEditedInterests(userData?.interests ? userData.interests.split(';') : []);
      setEditedTravelStyle(userData?.travel_style || ''); 
      setEditedBudget(userData?.budget !== null && userData?.budget !== undefined ? userData.budget.toString() : '');
      setEditedBudgetCurrency(userData?.budget_currency || 'RUB'); 
      setIsEditing(false);
      setShowInterestPicker(false);
      setShowStylePicker(false);
  };

    const handleStartEditing = () => {
        setEditedInterests(userData?.interests ? userData.interests.split(';') : []);
        setEditedTravelStyle(userData?.travel_style || '');
        setEditedBudget(userData?.budget !== null && userData?.budget !== undefined ? userData.budget.toString() : '') ;
        setEditedBudgetCurrency(userData?.budget_currency || 'RUB');
        setIsEditing(true); 
    };


  const handleLogoutClick = () => {
      console.log("Logout button clicked.");
      if (onLogout) {
          onLogout();
      }
  };


  const handleSelectInterest = (interest) => {
      if (editedInterests.includes(interest)) {
          setEditedInterests(editedInterests.filter(item => item !== interest));
      } else {
          setEditedInterests([...editedInterests, interest]);
      }
  };

  const handleSelectStyle = (style) => {
      if (editedTravelStyle === style) {
          
          setEditedTravelStyle('');
      } else {
          
          setEditedTravelStyle(style);
      }
      setShowStylePicker(false); 
  };


  if (isLoading && !userData) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка профиля...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Ошибка: {error}</div>;
  }

  if (!userData) {
       return <div style={{ padding: '20px', textAlign: 'center' }}>Профиль не найден.</div>;
  }

  return (
    <div style={{ padding: '25px 30px', maxWidth: '700px', margin: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 'var(--border-radius-md, 10px)', backgroundColor: 'var(--background-main-content, #ffffff)', boxShadow: 'var(--box-shadow-medium, 0 4px 10px rgba(0, 0, 0, 0.08))' }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>Профиль Пользователя</h2>

      {isEditing ? (
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>Email:</label>
          <p>{userData.email}</p>

          
          <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Интересы:</label>
          <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px', minHeight: '40px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                  
                  {editedInterests.map(interest => (
                      <span key={interest} style={{ backgroundColor: '#007bff', color: 'white', borderRadius: '12px', padding: '4px 10px', fontSize: '0.9em', cursor: 'pointer' }} onClick={() => handleSelectInterest(interest)}>
                          {interest}
                      </span>
                  ))}
                   
                  <button type="button" style={{ padding: '4px 8px', borderRadius: '12px', border: '1px solid #28a745', backgroundColor: '#28a745', color: 'white', cursor: 'pointer', fontSize: '1em' }} onClick={() => setShowInterestPicker(true)}>
                       +
                   </button>
              </div>
              
              {showInterestPicker && (
                  <div style={{
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '8px',
                      marginTop: '10px',
                      backgroundColor: '#f9f9f9',
                      maxHeight: '150px',
                      overflowY: 'auto',
                  }}>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Выберите интересы (можно несколько):</p>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                           {AVAILABLE_INTERESTS.map(interest => (
                               <span
                                   key={interest}
                                   style={{
                                       backgroundColor: editedInterests.includes(interest) ? '#007bff' : '#e9e9eb',
                                       color: editedInterests.includes(interest) ? 'white' : '#333',
                                       borderRadius: '12px',
                                       padding: '4px 10px',
                                       fontSize: '0.9em',
                                       cursor: 'pointer',
                                       border: '1px solid #ccc',
                                   }}
                                   onClick={() => handleSelectInterest(interest)}
                               >
                                   {interest}
                               </span>
                           ))}
                       </div>
                      <button type="button" style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setShowInterestPicker(false)}>Закрыть</button>
                  </div>
              )}
          </div>


          
          <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Стиль путешествия:</label>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               
               <span style={{
                   backgroundColor: editedTravelStyle ? '#007bff' : '#e9e9eb', 
                   color: editedTravelStyle ? 'white' : '#333',
                   borderRadius: '12px',
                   padding: '4px 10px',
                   fontSize: '0.9em',
                   minWidth: '100px',
                   textAlign: 'center',
                   border: editedTravelStyle ? 'none' : '1px solid #ccc', 
               }}>
                  {editedTravelStyle || 'Не выбран'} 
               </span>
               
               <button type="button" style={{ padding: '4px 8px', borderRadius: '12px', border: '1px solid #28a745', backgroundColor: '#28a745', color: 'white', cursor: 'pointer', fontSize: '1em' }} onClick={() => setShowStylePicker(true)}>
                    +
                </button>
           </div>
           {showStylePicker && (
               <div style={{
                   border: '1px solid #ccc',
                   borderRadius: '4px',
                   padding: '8px',
                   marginTop: '10px',
                   backgroundColor: '#f9f9f9',
                   maxHeight: '150px',
                   overflowY: 'auto',
               }}>
                   <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Выберите стиль (только один):</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {AVAILABLE_TRAVEL_STYLES.map(style => (
                            <span
                                key={style}
                                style={{
                                    backgroundColor: editedTravelStyle === style ? '#007bff' : '#e9e9eb',
                                    color: editedTravelStyle === style ? 'white' : '#333',
                                    borderRadius: '12px',
                                    padding: '4px 10px',
                                    fontSize: '0.9em',
                                    cursor: 'pointer',
                                    border: '1px solid #ccc',
                                }}
                                onClick={() => handleSelectStyle(style)} 
                            >
                                {style}
                            </span>
                        ))}
                    </div>
                   <button type="button" style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setShowStylePicker(false)}>Закрыть</button>
               </div>
           )}


          <label style={{ fontWeight: 'bold' }}>Бюджет:</label>
           <input
             type="number"
             value={editedBudget}
             onChange={(e) => setEditedBudget(e.target.value)}
             min="0"
             placeholder="Максимальный бюджет"
             style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
           />

           
            <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Валюта бюджета:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                
                <span style={{
                    backgroundColor: '#e9e9eb',
                    color: '#333',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    fontSize: '0.9em',
                    minWidth: '50px',
                    textAlign: 'center',
                    border: '1px solid #ccc',
                }}>
                   {editedBudgetCurrency || 'RUB'} {/* Display selected currency or placeholder */}
                </span>
                 {/* Dropdown for currency selection */}
                <select
                    value={editedBudgetCurrency} 
                    onChange={(e) => setEditedBudgetCurrency(e.target.value)} 
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em', cursor: 'pointer' }}
                >
                    {AVAILABLE_CURRENCIES.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                </select>
            </div>


          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={handleCancelEdit} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Отмена
            </button>
            <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>

      ) : (
        <div>
          <p><strong>Email:</strong> {userData.email}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
               <strong style={{marginRight: '5px'}}>Интересы:</strong>
               {(userData.interests ? userData.interests.split(';') : []).filter(Boolean).map(interest => ( 
                   <span key={interest} style={{ backgroundColor: '#007bff', color: 'white', borderRadius: '12px', padding: '4px 10px', fontSize: '0.9em' }}>
                       {interest}
                   </span>
               ))}
               {!(userData.interests || '').split(';').filter(Boolean).length && 'Не указаны'} 
           </div>
          <p><strong>Стиль путешествия:</strong> {userData.travel_style || 'Не указан'}</p>
           <p><strong>Бюджет:</strong> {userData.budget !== null ? `${userData.budget} ${userData.budget_currency || ''}` : 'Не указан'}</p>
          <p><strong>Зарегистрирован:</strong> {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}</p>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={handleStartEditing} disabled={isLoading} style={{ 
                  padding: '10px 20px', 
                  backgroundColor: 'var(--pastel-primary, #a7c7e7)', 
                  color: 'var(--text-on-pastel-primary, #2c3e50)', 
                  border: 'none', 
                  borderRadius: 'var(--border-radius-sm, 6px)', 
                  cursor: 'pointer',
                  fontSize: '1em', 
                  fontWeight: '500',
                  boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
                  transition: 'background-color 0.2s, box-shadow 0.2s',
                  marginRight: '10px'
               }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--pastel-primary-darker, #8aabbf)'; 
                  e.currentTarget.style.boxShadow = 'var(--box-shadow-medium, 0 4px 8px rgba(0,0,0,0.1))';
                  }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--pastel-primary, #a7c7e7)';
                  e.currentTarget.style.boxShadow = 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))';
                  }}
               >
              Редактировать
            </button>
            <button onClick={handleLogoutClick} disabled={isLoading} style={{ 
              padding: '10px 20px', 
              backgroundColor: 'var(--pastel-danger, #f8caca)', 
              color: '#7f1d1d', 
                               
              border: 'none', 
              borderRadius: 'var(--border-radius-sm, 6px)', 
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: '500',
              boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
              transition: 'background-color 0.2s, box-shadow 0.2s',
            }}
                             onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--pastel-danger-darker, #f3b9b9)'; 
                                e.currentTarget.style.boxShadow = 'var(--box-shadow-medium, 0 4px 8px rgba(0,0,0,0.1))';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--pastel-danger, #f8caca)';
                                e.currentTarget.style.boxShadow = 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))';
                            }}>
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;