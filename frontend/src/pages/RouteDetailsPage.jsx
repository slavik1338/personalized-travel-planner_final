import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReviewList from '../components/ReviewList'; 

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};


function RouteDetailsPage() {
  const { route_id } = useParams();
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRouteDetails = async () => {
      setIsLoading(true);
      setError(null);
      const userId = getCurrentUserId(); 

      if (userId === null) {
          setError("User ID not available. Please log in.");
          setIsLoading(false);
          return;
      }
      if (!route_id) {
           setError("Route ID not provided in URL.");
           setIsLoading(false);
           return;
      }

      try {
        const headers = {
            'X-User-ID': userId.toString(), 
        };

        const routeIdNumber = parseInt(route_id, 10);
        if (isNaN(routeIdNumber)) {
             setError("Invalid Route ID format in URL.");
             setIsLoading(false);
             return;
        }

        const response = await fetch(`${API_BASE_URL}/routes/${routeIdNumber}`, {
          method: 'GET',
          headers: headers, 
        });

        const responseData = await response.json();

        if (!response.ok) {
          setError(responseData.detail || `Error loading route details: ${response.status}`);
        } else {
          setRouteData(responseData);
          console.log("Route details loaded:", responseData);
        }

      } catch (err) {
        setError(`Network error: ${err.message}`);
        console.error("Failed to fetch route details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (route_id) {
        fetchRouteDetails();
    }
  }, [route_id]); 


  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка деталей маршрута...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Ошибка: {error}</div>;
  }

  if (!routeData) {
       return <div style={{ padding: '20px', textAlign: 'center' }}>Детали маршрута не найдены.</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}> 
      <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: '20px' }}>Детали Маршрута </h2>

       <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <p><strong>Примерная общая стоимость:</strong> {routeData.total_cost?.toFixed(2)} {routeData.total_cost_currency}</p>
            <p><strong>Длительность:</strong> {routeData.duration_days} дней</p>
       </div>


      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Порядок посещения:</h3>

      {routeData.locations_on_route && routeData.locations_on_route.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
              {routeData.locations_on_route.map(locationDetail => (
                  <li key={`${locationDetail.location_id}-${locationDetail.visit_order}`} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#fff' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.1em' }}>
                          {locationDetail.visit_order + 1}. {locationDetail.location_name}
                          {locationDetail.location_type && ` (${locationDetail.location_type})`}
                      </p>
                       {locationDetail.activity_name && ( 
                           <div style={{ marginLeft: '15px', paddingLeft: '15px', borderLeft: '2px solid #007bff', marginBottom: '10px' }}>
                               <p style={{ margin: '0 0 5px 0', fontStyle: 'italic', fontWeight: 'bold' }}>
                                   Активность: {locationDetail.activity_name}
                               </p>
                               {locationDetail.activity_description && (
                                   <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>
                                       {locationDetail.activity_description}
                                   </p>
                               )}
                               <ReviewList
                                  targetId={locationDetail.activity_id}
                                  targetType="activity"
                               />
                           </div>
                       )}
                      {locationDetail.location_description && !locationDetail.activity_name && (
                          <p style={{ margin: '0 0 10px 0', color: '#555' }}>
                              {locationDetail.location_description}
                          </p>
                      )}
                      {!locationDetail.activity_id && locationDetail.location_id && (
                          <ReviewList
                             targetId={locationDetail.location_id}
                             targetType="location"
                          />
                      )}
                  </li>
              ))}
          </ul>
      ) : (
          <p>Нет информации о местах в этом маршруте.</p>
      )}
    </div>
  );
}

export default RouteDetailsPage;