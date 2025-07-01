import React, { useState, useEffect, useCallback } from 'react';
import ReviewItem from './ReviewItem';
import ReviewForm from './ReviewForm';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';


const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

function ReviewList({ targetId, targetType }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false); 

  const currentUserId = getCurrentUserId();

  const fetchReviews = useCallback(async () => {
    if (!targetId || !targetType) return;
    setIsLoading(true);
    setError(null);

    const url = `${API_BASE_URL}/reviews/${targetType}/${targetId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Error fetching reviews: ${response.status}`);
      }
      setReviews(data);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch reviews:", err);
      setReviews([]); 
    } finally {
      setIsLoading(false);
    }
  }, [targetId, targetType]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReviewSubmitted = (newReview) => {
    setReviews(prevReviews => [newReview, ...prevReviews]); 
    setShowForm(false); 
  };

  if (isLoading) {
    return <p style={{ fontStyle: 'italic', color: '#777', marginTop: '10px' }}>Загрузка отзывов...</p>;
  }

  if (error) {
    return <p style={{ color: 'red', marginTop: '10px' }}>Ошибка загрузки отзывов: {error}</p>;
  }

  return (
    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
      <h4 style={{ marginBottom: '15px' }}>Отзывы ({reviews.length})</h4>
      {reviews.length === 0 && !isLoading && (
        <p>Отзывов пока нет. Будьте первым!</p>
      )}
      {reviews.map(review => (
        <ReviewItem key={review.id} review={review} />
      ))}

      {currentUserId && ( 
        <>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: '20px', 
                padding: '10px 18px',
                backgroundColor: 'var(--pastel-primary, #a7c7e7)',
                color: 'var(--text-on-pastel-primary, #2c3e50)',
                border: 'none',
                borderRadius: 'var(--border-radius-sm, 6px)',
                cursor: 'pointer',
                fontSize: '0.95em',
                fontWeight: '500',
                boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
                transition: 'background-color 0.2s, box-shadow 0.2s',
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
              Оставить отзыв
            </button>
          )}
          {showForm && (
            <ReviewForm
              targetId={targetId}
              targetType={targetType}
              onReviewSubmitted={handleReviewSubmitted}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ReviewList;