import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReviewList from '../components/ReviewList';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

function ReviewsPage() {
    const [userQueries, setUserQueries] = useState([]);
    const [selectedQuery, setSelectedQuery] = useState(null);
    
    const [routeDetails, setRouteDetails] = useState(null);
    const [selectedPoi, setSelectedPoi] = useState(null); 
    const [isLoadingQueries, setIsLoadingQueries] = useState(false);
    const [isLoadingRouteDetails, setIsLoadingRouteDetails] = useState(false);
    const [error, setError] = useState(null);

    const userId = getCurrentUserId();

    useEffect(() => {
        if (!userId) {
            setError("Пожалуйста, войдите в систему для просмотра отзывов.");
            return;
        }
        setIsLoadingQueries(true);
        setError(null);
        fetch(`${API_BASE_URL}/queries/history/${userId}`, {
            headers: { 'X-User-ID': userId.toString() }
        })
            .then(res => {
                if (!res.ok) throw new Error(`Ошибка загрузки истории: ${res.status}`);
                return res.json();
            })
            .then(data => {
                const queriesWithRoutes = data.filter(
                    q => q.parameters && q.parameters.route_id && parseInt(q.parameters.route_id, 10) > 0
                );
                setUserQueries(queriesWithRoutes);
            })
            .catch(err => {
                setError(err.message);
                console.error("Failed to fetch user queries:", err);
            })
            .finally(() => setIsLoadingQueries(false));
    }, [userId]);

    const handleQuerySelect = useCallback(async (query) => {
        if (!query || !query.parameters || !query.parameters.route_id) return;

        setSelectedQuery(query);
        setSelectedPoi(null);
        setRouteDetails(null);
        setIsLoadingRouteDetails(true);
        setError(null);
        
        const routeId = query.parameters.route_id;

        try {
            const response = await fetch(`${API_BASE_URL}/routes/${routeId}`, {
                headers: { 'X-User-ID': userId.toString() }
            });
            if (!response.ok) throw new Error(`Ошибка загрузки деталей маршрута: ${response.status}`);
            const data = await response.json();
            setRouteDetails(data);
        } catch (err) {
            setError(err.message);
            console.error("Failed to fetch route details:", err);
        } finally {
            setIsLoadingRouteDetails(false);
        }
    }, [userId]);
    
    const selectedStyle = { backgroundColor: '#e7f3ff', fontWeight: 'bold' };

    if (!userId) {
        return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>{error || "Необходимо войти в систему."}</div>;
    }

    return (
        <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
            <div style={{ width: '300px', borderRight: '1px solid #eee', paddingRight: '20px' }}>
                <h3 style={{ marginTop: 0 }}>Ваши маршруты</h3>
                {isLoadingQueries && <p>Загрузка маршрутов...</p>}
                {error && !isLoadingQueries && <p style={{ color: 'red' }}>{error}</p>}
                {!isLoadingQueries && userQueries.length === 0 && <p>У вас пока нет маршрутов с отзывами.</p>}
                
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {userQueries.map(query => (
                        <li 
                            key={query.id} 
                            onClick={() => handleQuerySelect(query)}
                            style={{ 
                                padding: '10px', 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f0f0f0',
                                borderRadius: '4px',
                                marginBottom: '5px',
                                ...(selectedQuery?.id === query.id ? selectedStyle : {})
                            }}
                        >
                            Запрос: "{query.query_text.substring(0, 30)}{query.query_text.length > 30 ? '...' : ''}"
                            <br/>
                            <small>Маршрут ID: {query.parameters.route_id}</small>
                        </li>
                    ))}
                </ul>
            </div>

            <div style={{ flex: 1 }}>
                {!selectedQuery && <p>Выберите маршрут из списка слева, чтобы посмотреть места и оставить отзывы.</p>}
                
                {isLoadingRouteDetails && <p>Загрузка деталей маршрута...</p>}
                
                {routeDetails && (
                    <div>
                        <h3 style={{ marginTop: 0 }}>Места в маршруте "{routeDetails.query_id ? `(Запрос ID: ${routeDetails.query_id})` : `ID: ${routeDetails.route_id}`}"</h3>
                        

                        {routeDetails.locations_on_route && routeDetails.locations_on_route.length > 0 ? (
                            routeDetails.locations_on_route.map(poi => (
                                <div 
                                    key={`${poi.location_id || 'loc_unknown'}-${poi.activity_id || 'act_unknown'}-${poi.visit_order}`}
                                    style={{ 
                                        border: '1px solid #ddd', 
                                        borderRadius: '8px', 
                                        padding: '15px', 
                                        marginBottom: '15px',
                                        cursor: 'pointer', 
                                        backgroundColor: selectedPoi && 
                                                         ((selectedPoi.type === 'location' && selectedPoi.id === poi.location_id) || 
                                                          (selectedPoi.type === 'activity' && selectedPoi.id === poi.activity_id)) 
                                                          ? '#f0f8ff' : '#fff' 
                                    }}
                                    onClick={() => setSelectedPoi({ 
                                        id: poi.activity_id || poi.location_id, 
                                        type: poi.activity_id ? 'activity' : 'location',
                                        name: poi.activity_name || poi.location_name
                                    })}
                                >
                                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                                        {poi.visit_order + 1}. {poi.location_name}
                                        {poi.location_type && ` (${poi.location_type})`}
                                    </p>
                                    {poi.activity_name && (
                                       <p style={{ margin: '0 0 5px 0', fontStyle: 'italic' }}>
                                           Активность: {poi.activity_name}
                                       </p>
                                    )}
                                    {selectedPoi && 
                                     ((selectedPoi.type === 'location' && selectedPoi.id === poi.location_id && !poi.activity_id) || 
                                      (selectedPoi.type === 'activity' && selectedPoi.id === poi.activity_id)) && ( 
                                        <ReviewList 
                                            targetId={selectedPoi.id}
                                            targetType={selectedPoi.type}
                                        />
                                    )}
                                </div>
                            ))
                        ) : (
                            <p>В этом маршруте нет информации о местах.</p>
                        )}
                    </div>
                )}
                {selectedQuery && !isLoadingRouteDetails && !routeDetails && error && (
                     <p style={{ color: 'red' }}>Не удалось загрузить детали маршрута. {error}</p>
                )}
            </div>
        </div>
    );
}

export default ReviewsPage;