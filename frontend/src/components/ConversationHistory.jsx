// frontend/src/components/ConversationHistory.jsx
import React from 'react';

// Пропсы onFinalizeRoute и onEditRouteRequest передаются из HomePage
function ConversationHistory({ conversation, onFinalizeRoute, onEditRouteRequest }) {
    
    // Общие стили для контейнера сообщений
    const messageContainerBaseStyle = {
        padding: '12px 18px',
        margin: '10px 0',
        maxWidth: '78%', // Максимальная ширина сообщения
        wordBreak: 'break-word',
        boxShadow: 'var(--box-shadow-soft)',
        lineHeight: '1.55',
        fontSize: '0.95rem',
    };

    const renderMessage = (item, index) => {
        if (item.type === 'user') {
            return (
                <div 
                    key={`${index}-user-${item.text.slice(0,10)}`} // Более уникальный ключ
                    style={{
                        ...messageContainerBaseStyle,
                        alignSelf: 'flex-end',
                        backgroundColor: 'var(--pastel-primary)', // Яркий синий для пользователя
                        color: 'var(--text-on-pastel-primary)',
                        borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) var(--border-radius-sm) var(--border-radius-lg)', 
                        marginLeft: 'auto', // Прижимаем к правому краю
                    }}
                >
                    {item.text}
                </div>
            );
        } else if (item.type === 'system') {
             const systemMessageStyle = {
                 ...messageContainerBaseStyle,
                 alignSelf: 'flex-start',
                 backgroundColor: item.isError ? 'var(--pastel-danger)' : 'var(--background-main-content)', // Светло-красный для ошибок, светло-серый для обычных
                 color: item.isError ? '#a94442' : 'var(--text-dark)',
                 border: item.isError ? '1px solid #ebccd1': '1px solid var(--border-color)', 
                 borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) var(--border-radius-lg) var(--border-radius-sm)', 
                 marginRight: 'auto', // Прижимаем к левому краю
             };
             return (
                 <div key={`${index}-system-${item.text.slice(0,10)}`} style={systemMessageStyle}>
                     {item.text}
                 </div>
             );
        } else if (item.type === 'system_route') {
             const route = item.data; // Это объект RouteDetailsResponse или FullRouteDetailsResponse
             
             return (
                 <div 
                    key={`${index}-route-${route.route_id}`} // Уникальный ключ для маршрута
                    style={{ 
                        alignSelf: 'stretch', // Растягиваем на всю доступную ширину
                        backgroundColor: 'var(--background-main-content)',
                        color: 'var(--text-dark)',      // Темно-синий текст
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)', // Более выраженное скругление
                        padding: '20px',
                        margin: '15px 0',
                        boxShadow: 'var(--box-shadow-medium)',
                    }}
                 >
                     {/* Убираем ID из заголовка для пользователя */}
                     <h4 style={{ margin: '0 0 12px 0', color: '#0d47a1', fontSize: '1.2em', borderBottom: '1px solid #90caf9', paddingBottom: '8px' }}>
                        Ваш маршрут готов!
                     </h4>
                     <div style={{fontSize: '0.95em', marginBottom: '15px', lineHeight: '1.6'}}>
                        <p style={{ margin: '0 0 7px 0' }}>
                            <strong>Примерная стоимость:</strong> {route.total_cost?.toFixed(2)} {route.total_cost_currency}
                        </p>
                        <p style={{ margin: '0 0 10px 0' }}>
                            <strong>Длительность:</strong> {route.duration_days} дней
                        </p>
                     </div>
                     
                     <p style={{margin: '0 0 8px 0', fontWeight: '500', color: '#1565c0'}}>Детали поездки:</p>
                     <pre style={{
                         overflowX: 'auto',
                         whiteSpace: 'pre-wrap',
                         wordWrap: 'break-word',
                         backgroundColor: 'var(--background-conversation)', // Белый фон для текста маршрута
                         padding: '15px',
                         borderRadius: 'var(--border-radius-sm)',
                         border: '1px solid var(--border-color)',
                         fontSize: '0.9em',
                         color: 'var(--text-dark)', // Текст темнее для лучшей читаемости
                         maxHeight: '400px', // Увеличил максимальную высоту
                         overflowY: 'auto',
                         lineHeight: '1.7', // Увеличил межстрочный интервал в pre
                     }}>
                         {route.route_text}
                     </pre>

                     {(!route.is_finalized) && (
                         <div style={{ marginTop: '18px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                             <button
                                 onClick={() => onFinalizeRoute(route.route_id)}
                                 style={{ padding: '10px 18px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95em', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
                             >
                                 Мне всё нравится
                             </button>
                             <button
                                 onClick={() => onEditRouteRequest(route)}
                                 style={{ padding: '10px 18px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95em', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
                             >
                                 Изменить маршрут
                             </button>
                         </div>
                     )}
                     {route.is_finalized && (
                        <div style={{ marginTop: '18px', padding: '10px', backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '6px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold', fontSize: '0.95em' }}>
                                Этот маршрут утвержден.
                            </p>
                        </div>
                     )}
                 </div>
             );
        }
        return null;
    };

    return (
      <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%',
          padding: '0 10px' // Небольшой отступ для самих сообщений от краев контейнера
        }}
      >
        {conversation.map(renderMessage)}
      </div>
    );
}

export default ConversationHistory;