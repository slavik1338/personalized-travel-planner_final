import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';


const StarRatingInput = ({ rating, setRating }) => {
  const totalStars = 5;
  return (
    <div>
      {[...Array(totalStars)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <span
            key={ratingValue}
            style={{
              cursor: 'pointer',
              color: ratingValue <= rating ? '#ffc107' : '#e0e0e0',
              fontSize: '2em',
              marginRight: '5px',
            }}
            onClick={() => setRating(ratingValue)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

function ReviewForm({ targetId, targetType, onReviewSubmitted, currentUserId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Пожалуйста, выберите рейтинг.');
      return;
    }
    if (!currentUserId) {
        setError('Не удалось определить пользователя. Пожалуйста, войдите в систему.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage('');

    const reviewData = {
      rating: rating,
      comment: comment,
    };

    if (targetType === 'location') {
      reviewData.location_id = targetId;
    } else if (targetType === 'activity') {
      reviewData.activity_id = targetId;
    } else {
      setError('Неверный тип цели для отзыва.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reviews/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId.toString(),
        },
        body: JSON.stringify(reviewData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || `Ошибка ${response.status}`);
      }

      setSuccessMessage('Отзыв успешно добавлен!');
      setRating(0); 
      setComment('');
      if (onReviewSubmitted) {
        onReviewSubmitted(responseData); 
      }
    } catch (err) {
      setError(err.message || 'Не удалось отправить отзыв.');
      console.error("Failed to submit review:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '20px',
      marginTop: '15px',
      backgroundColor: '#fff',
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Оставить отзыв</h4>
      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green', marginBottom: '10px' }}>{successMessage}</p>}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Рейтинг:</label>
        <StarRatingInput rating={rating} setRating={setRating} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor={`comment-${targetType}-${targetId}`} style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Комментарий (необязательно):
        </label>
        <textarea
          id={`comment-${targetType}-${targetId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows="4"
          placeholder="Поделитесь вашими впечатлениями..."
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || rating === 0}
        style={{
          padding: '10px 18px',
          backgroundColor: (isLoading || rating === 0) ? '#ccc' : 'var(--pastel-success, #c1e1c1)', 
          color: (isLoading || rating === 0) ? '#666' : 'var(--text-on-pastel-success, #388e3c)',    
          border: 'none',
          borderRadius: 'var(--border-radius-sm, 6px)',
          cursor: (isLoading || rating === 0) ? 'not-allowed' : 'pointer',
          fontSize: '1em',
          fontWeight: '500',
          boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
          transition: 'background-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
            if (!(isLoading || rating === 0)) {
                e.currentTarget.style.backgroundColor = 'var(--pastel-success-darker, #a9d1a9)'; 
                e.currentTarget.style.boxShadow = 'var(--box-shadow-medium, 0 4px 8px rgba(0,0,0,0.1))';
            }
        }}
        onMouseLeave={(e) => {
            if (!(isLoading || rating === 0)) {
                e.currentTarget.style.backgroundColor = 'var(--pastel-success, #c1e1c1)';
                e.currentTarget.style.boxShadow = 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))';
            }
        }}
      >
        {isLoading ? 'Отправка...' : 'Отправить отзыв'}
      </button>
    </form>
  );
}

export default ReviewForm;