// frontend/src/components/POISearchModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash'; // Установи `lodash` если еще нету: npm install lodash

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

function POISearchModal({ isOpen, onClose, onPOISelected, currentPOIName }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchSearchResults = useCallback(
        debounce(async (query) => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                if (query.length > 0 && query.length < 2) {
                     setError("Введите минимум 2 символа для поиска.");
                } else {
                    setError(null);
                }
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/search/items?query=${encodeURIComponent(query)}&limit=10`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ detail: `Ошибка сервера: ${response.status}` }));
                    throw new Error(errData.detail || `Ошибка поиска: ${response.status}`);
                }
                const data = await response.json();
                setSearchResults(data);
                if (data.length === 0) {
                    setError("Ничего не найдено по вашему запросу.");
                }
            } catch (err) {
                setError(err.message);
                setSearchResults([]);
                console.error("Failed to fetch search results:", err);
            } finally {
                setIsLoading(false);
            }
        }, 500), // Задержка debounce в 500ms
        [] // Зависимости useCallback
    );

    useEffect(() => {
        if (isOpen) {
            // Сброс состояния при открытии модального окна
            setSearchQuery('');
            setSearchResults([]);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery) {
            fetchSearchResults(searchQuery);
        } else {
            setSearchResults([]); // Очищаем результаты, если запрос пустой
            setError(null);
        }
        // Отменяем предыдущий debounce вызов при размонтировании или изменении fetchSearchResults
        return () => fetchSearchResults.cancel();
    }, [searchQuery, fetchSearchResults]);


    const handleSelectPOI = (poi) => {
        onPOISelected({
            new_item_id: poi.id,
            new_item_type: poi.item_type, // 'location' или 'activity'
        });
        onClose(); // Закрываем модальное окно после выбора
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div style={{ /* Стили для оверлея модального окна (как в VisualRouteEditor) */
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1002 // Выше чем VisualRouteEditor
        }}>
            <div style={{ /* Стили для контента модального окна */
                backgroundColor: 'white', padding: '25px', borderRadius: '8px',
                width: '90%', maxWidth: '600px', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                    Заменить "{currentPOIName || 'пункт'}" на:
                </h3>
                
                <input
                    type="text"
                    placeholder="Введите название места или активности..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: 'calc(100% - 22px)', padding: '10px', marginBottom: '15px',
                        border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em'
                    }}
                    autoFocus
                />

                {isLoading && <p style={{ textAlign: 'center', color: '#555' }}>Поиск...</p>}
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <div style={{ flexGrow: 1, overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    {searchResults.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {searchResults.map(poi => (
                                <li key={`${poi.item_type}-${poi.id}`}
                                    onClick={() => handleSelectPOI(poi)}
                                    style={{
                                        padding: '12px 10px',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        backgroundColor: '#fff', // Для эффекта при наведении
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                                >
                                    <strong>{poi.name}</strong>
                                    <span style={{ fontSize: '0.85em', color: '#777', marginLeft: '8px' }}>
                                        ({poi.item_type === 'location' ? 'Место' : 'Активность'})
                                    </span>
                                    {poi.city && <span style={{ fontSize: '0.8em', color: '#888', display: 'block' }}>{poi.city}{poi.country ? `, ${poi.country}` : ''}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}

export default POISearchModal;