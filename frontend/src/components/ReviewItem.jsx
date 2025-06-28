// frontend/src/components/ReviewItem.jsx
import React from 'react';

// Простой компонент для отображения звезд (можно улучшить)
const StarRatingDisplay = ({ rating }) => {
  const totalStars = 5;
  let stars = [];
  for (let i = 1; i <= totalStars; i++) {
    stars.push(
      <span key={i} style={{ color: i <= rating ? '#ffc107' : '#e0e0e0', fontSize: '1.2em' }}>
        ★ {/* Звезда */}
      </span>
    );
  }
  return <div>{stars}</div>;
};

function ReviewItem({ review }) {
  if (!review) {
    return null;
  }

  const { rating, comment, review_date, user_id } = review; // Предполагаем, что user_id есть

  return (
    <div style={{
      border: '1px solid #eee',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <StarRatingDisplay rating={rating} />
        <span style={{ fontSize: '0.85em', color: '#777' }}>
          {new Date(review_date).toLocaleDateString()}
        </span>
      </div>
      {comment && <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{comment}</p>}
      <p style={{ fontSize: '0.8em', color: '#555', margin: 0 }}>
        Отзыв от пользователя ID: {user_id} {/* Позже можно заменить на имя пользователя, если будет такая информация */}
      </p>
    </div>
  );
}

export default ReviewItem;