// frontend/src/pages/Recommendations.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReviewList from '../components/ReviewList'; // Для отображения отзывов по клику

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

// Компонент для отображения одной рекомендации
const RecommendationCard = ({ item, onShowReviews }) => {
    return (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#333' }}>{item.name}</h4>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>
                Тип: {item.item_type === 'location' ? 'Место' : 'Активность'}
                {item.city && `, ${item.city}`}
                {item.country && `, ${item.country}`}
            </p>
            {item.rating && (
                <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>
                    Рейтинг: {item.rating.toFixed(1)}/5.0
                </p>
            )}
            {item.description && (
                <p style={{ fontSize: '0.95em', color: '#444', marginBottom: '12px', whiteSpace: 'pre-line' }}>
                    {item.description.substring(0, 150)}{item.description.length > 150 ? '...' : ''}
                </p>
            )}
            <button
                onClick={() => onShowReviews(item)}
                style={{
                    padding: '8px 15px', // Можно сделать чуть меньше, если кнопка внутри карточки
                    backgroundColor: 'var(--pastel-primary, #a7c7e7)',
                    color: 'var(--text-on-pastel-primary, #2c3e50)',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm, 6px)',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: '500',
                    boxShadow: 'var(--box-shadow-soft, 0 1px 3px rgba(0,0,0,0.04))', // Меньше тень
                    transition: 'background-color 0.2s, box-shadow 0.2s',
                    marginTop: '10px' // Отступ сверху
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--pastel-primary-darker, #8aabbf)';
                    e.currentTarget.style.boxShadow = 'var(--box-shadow-medium, 0 2px 5px rgba(0,0,0,0.08))';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--pastel-primary, #a7c7e7)';
                    e.currentTarget.style.boxShadow = 'var(--box-shadow-soft, 0 1px 3px rgba(0,0,0,0.04))';
                }}
            >
                Посмотреть отзывы
            </button>
        </div>
    );
};

function RecommendationsPage() {
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileMessage, setProfileMessage] = useState('');

    const [selectedItemForReviews, setSelectedItemForReviews] = useState(null);

    const userId = getCurrentUserId();

    useEffect(() => {
        if (!userId) {
            setError("Пожалуйста, войдите в систему для просмотра рекомендаций.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setProfileMessage('');

        fetch(`${API_BASE_URL}/recommendations/personalized`, {
            headers: { 'X-User-ID': userId.toString() }
        })
            .then(res => {
                if (!res.ok) {
                    // Пытаемся прочитать тело ошибки, если есть
                    return res.json().then(errData => {
                        throw new Error(errData.detail || `Ошибка загрузки рекомендаций: ${res.status}`);
                    }).catch(() => {
                        // Если тело ошибки не JSON или пустое
                        throw new Error(`Ошибка загрузки рекомендаций: ${res.status}`);
                    });
                }
                return res.json();
            })
            .then(data => {
                if (data.length === 0) {
                    setProfileMessage(
                        <span>
                            Мы еще ничего не знаем о вас или не смогли найти подходящих рекомендаций.
                            Чтобы получать более точные предложения, <Link to="/profile" style={{color: '#007bff'}}>заполните информацию в профиле</Link> (особенно ваши интересы).
                        </span>
                    );
                }
                setRecommendations(data);
            })
            .catch(err => {
                setError(err.message);
                console.error("Failed to fetch recommendations:", err);
            })
            .finally(() => setIsLoading(false));
    }, [userId]);

    const handleShowReviews = (item) => {
        setSelectedItemForReviews(item);
    };

    const handleCloseReviewsModal = () => {
        setSelectedItemForReviews(null);
    };

    if (isLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка рекомендаций...</div>;
    }

    if (error && !profileMessage) { // Показываем ошибку, только если нет специального сообщения о профиле
        return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Персональные Рекомендации</h2>

            {profileMessage && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #b3d7ff',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    color: '#004085'
                }}>
                    {profileMessage}
                </div>
            )}

            {recommendations.length > 0 ? (
                <div className="recommendations-list">
                    {recommendations.map(item => (
                        <RecommendationCard
                            key={`${item.item_type}-${item.id}`}
                            item={item}
                            onShowReviews={handleShowReviews}
                        />
                    ))}
                </div>
            ) : (
                !profileMessage && !isLoading && <p style={{ textAlign: 'center' }}>Нет доступных рекомендаций.</p>
            )}

            {/* Модальное окно или секция для отображения отзывов */}
            {selectedItemForReviews && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1001
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                        width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h3 style={{marginTop: 0}}>Отзывы о "{selectedItemForReviews.name}"</h3>
                        <ReviewList
                            targetId={selectedItemForReviews.id}
                            targetType={selectedItemForReviews.item_type}
                        />
                        <button
                            onClick={handleCloseReviewsModal}
                            style={{
                                marginTop: '20px', padding: '10px 15px',
                                backgroundColor: '#6c757d', color: 'white',
                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                            }}
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecommendationsPage;