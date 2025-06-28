// frontend/src/components/VisualRouteEditor.jsx
import React, { useState, useEffect } from 'react';
import POISearchModal from './POISearchModal'; // Убедись, что этот компонент существует и импортируется

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

function VisualRouteEditor({ initialRouteData, onSaveChanges, onCancelEdit }) {
    const [routeData, setRouteData] = useState(initialRouteData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(''); // Для временных сообщений об успехе

    // Состояние для модального окна ЗАМЕНЫ POI: { map_id: int, current_name: str } | null
    const [replacingPOIInfo, setReplacingPOIInfo] = useState(null); 
    
    // Состояние для модального окна ДОБАВЛЕНИЯ POI: boolean
    const [isAddingPOI, setIsAddingPOI] = useState(false);

    useEffect(() => {
        setRouteData(initialRouteData);
        setError(null); // Сбрасываем ошибку при получении новых данных
        setSuccessMessage(''); // Сбрасываем сообщение об успехе
    }, [initialRouteData]);

    const displaySuccessMessage = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000); // Сообщение исчезнет через 3 секунды
    };

    const handleDeletePoi = async (mapIdToDelete) => {
        const userId = getCurrentUserId();
        if (!userId) { setError("Ошибка: Пользователь не авторизован."); return; }
        if (!routeData || !routeData.route_id) { setError("Ошибка: Данные маршрута отсутствуют."); return; }
        if (!window.confirm("Вы уверены, что хотите удалить этот пункт из маршрута?")) return;

        setIsLoading(true); setError(null); setSuccessMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/routes/${routeData.route_id}/locations/${mapIdToDelete}`, {
                method: 'DELETE', headers: { 'X-User-ID': userId.toString() },
            });
            const updatedRoute = await response.json();
            if (!response.ok) throw new Error(updatedRoute.detail || 'Не удалось удалить пункт маршрута.');
            setRouteData(updatedRoute);
            displaySuccessMessage("Пункт успешно удален!");
        } catch (err) { setError(err.message); console.error("Error deleting POI:", err);
        } finally { setIsLoading(false); }
    };

    const handleOpenReplaceModal = (mapId, currentName) => {
        setError(null); setSuccessMessage('');
        setReplacingPOIInfo({ map_id: mapId, current_name: currentName });
    };
    const handleCloseReplaceModal = () => setReplacingPOIInfo(null);

    const handlePOISelectedForReplacement = async (selectedPOIData) => {
        if (!replacingPOIInfo || !replacingPOIInfo.map_id || !selectedPOIData) {
            setError("Ошибка: Недостаточно данных для замены POI.");
            handleCloseReplaceModal(); return;
        }
        const userId = getCurrentUserId();
        if (!userId) { setError("Ошибка: Пользователь не авторизован."); handleCloseReplaceModal(); return; }
        
        setIsLoading(true); setError(null); setSuccessMessage('');
        const payload = { new_item_id: selectedPOIData.new_item_id, new_item_type: selectedPOIData.new_item_type };
        console.log(`Replacing POI (map_id: ${replacingPOIInfo.map_id}) in route ${routeData.route_id} with:`, payload);

        try {
            const response = await fetch(
                `${API_BASE_URL}/routes/${routeData.route_id}/locations/${replacingPOIInfo.map_id}`, 
                { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-ID': userId.toString() }, body: JSON.stringify(payload) }
            );
            const updatedRoute = await response.json();
            if (!response.ok) throw new Error(updatedRoute.detail || 'Не удалось заменить пункт маршрута.');
            setRouteData(updatedRoute);
            displaySuccessMessage("Пункт успешно заменен!");
        } catch (err) { setError(`Ошибка замены POI: ${err.message}`); console.error("Error replacing POI:", err);
        } finally { setIsLoading(false); handleCloseReplaceModal(); }
    };
    
    const handleOpenAddPOIModal = () => {
        setError(null); setSuccessMessage('');
        setIsAddingPOI(true);
    };
    const handleCloseAddPOIModal = () => setIsAddingPOI(false);

    const handlePOISelectedForAddition = async (selectedPOIData) => {
        const userId = getCurrentUserId();
        if (!userId) { setError("Ошибка: Пользователь не авторизован."); handleCloseAddPOIModal(); return; }
        
        setIsLoading(true); setError(null); setSuccessMessage('');
        const payload = { item_id: selectedPOIData.new_item_id, item_type: selectedPOIData.new_item_type };
        console.log(`Adding POI to route ${routeData.route_id}:`, payload);

        try {
            const response = await fetch(
                `${API_BASE_URL}/routes/${routeData.route_id}/locations`, 
                { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-ID': userId.toString() }, body: JSON.stringify(payload) }
            );
            const updatedRoute = await response.json();
            if (!response.ok) throw new Error(updatedRoute.detail || 'Не удалось добавить пункт в маршрут.');
            setRouteData(updatedRoute);
            displaySuccessMessage("Пункт успешно добавлен!");
        } catch (err) { setError(`Ошибка добавления POI: ${err.message}`); console.error("Error adding POI:", err);
        } finally { setIsLoading(false); handleCloseAddPOIModal(); }
    };

    const handleSaveChangesClick = () => {
        if (isLoading) return;
        onSaveChanges(routeData);
    };
    
    if (!routeData || !initialRouteData) { // initialRouteData тоже нужен для сброса при отмене, если решим это делать
        return 
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', zIndex: 1001 
        }}>
            <div style={{
                backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                width: '90%', maxWidth: '750px', maxHeight: '90vh', // Немного увеличил ширину
                display: 'flex', flexDirection: 'column', boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>
                        Редактирование маршрута
                    </h3>
                    <button
                        onClick={handleOpenAddPOIModal}
                        disabled={isLoading}
                        style={{ padding: '8px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                        ➕ Добавить пункт
                    </button>
                </div>
                
                {error && <p style={{ color: 'red', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', border: '1px solid #ef9a9a', marginBottom: '10px', textAlign: 'center' }}>Ошибка: {error}</p>}
                {successMessage && <p style={{ color: 'green', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '4px', border: '1px solid #a5d6a7', marginBottom: '10px', textAlign: 'center'  }}>{successMessage}</p>}
                
                <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '15px' }}>
                    {isLoading && !error && !successMessage && <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#555' }}>Обновление данных...</p>}
                    
                    {!isLoading && routeData.locations_on_route && routeData.locations_on_route.length > 0 ? (
                        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                            {routeData.locations_on_route.map((poi) => (
                            <li key={poi.map_id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 8px', borderBottom: '1px solid #f0f0f0',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ flexGrow: 1, marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        marginRight: '10px', 
                                        color: '#555', 
                                        minWidth: '25px' // Для выравнивания номеров
                                    }}>{poi.visit_order + 1}.</span>
                                    <div>
                                        <span style={{ fontWeight: '500', display: 'block' }}>{poi.location_name}</span>
                                        {poi.activity_name && <span style={{ fontStyle: 'italic', color: '#555', fontSize: '0.9em' }}>{` (Активность: ${poi.activity_name})`}</span>}
                                        <small style={{ color: '#777', display: 'block', marginTop: '3px' }}>
                                            {poi.location_type || 'Место'}
                                            {/* (map_id: {poi.map_id}) */}
                                        </small>
                                    </div>
                                </div>
                                <div style={{display: 'flex', gap: '8px', flexShrink: 0}}>
                                    <button
                                        onClick={() => handleOpenReplaceModal(poi.map_id, poi.location_name + (poi.activity_name ? ` (${poi.activity_name})` : ''))}
                                        disabled={isLoading} title="Заменить этот пункт"
                                        style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9em' }}
                                    >
                                        ✏️ Заменить
                                    </button>
                                    <button
                                        onClick={() => handleDeletePoi(poi.map_id)}
                                        disabled={isLoading} title="Удалить этот пункт"
                                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9em' }}
                                    >
                                        🗑️ Удалить
                                    </button>
                                </div>
                            </li>
                            ))}
                        </ul>
                    ) : (
                        !isLoading && <p style={{textAlign: 'center', color: '#777', padding: '20px 0'}}>В этом маршруте нет пунктов для редактирования.</p>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <button onClick={onCancelEdit} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Отмена
                    </button>
                    <button onClick={handleSaveChangesClick} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {isLoading ? 'Сохранение...' : 'Сохранить и закрыть'}
                    </button>
                </div>
            </div>

            {/* Модальное окно для ЗАМЕНЫ POI */}
            {replacingPOIInfo && (
                 <POISearchModal
                    isOpen={replacingPOIInfo !== null}
                    onClose={handleCloseReplaceModal}
                    onPOISelected={handlePOISelectedForReplacement}
                    currentPOIName={replacingPOIInfo?.current_name}
                />
            )}

            {/* Модальное окно для ДОБАВЛЕНИЯ POI */}
            {isAddingPOI && (
                <POISearchModal
                    isOpen={isAddingPOI}
                    onClose={handleCloseAddPOIModal}
                    onPOISelected={handlePOISelectedForAddition}
                    currentPOIName={null} // Для добавления не нужно имя текущего POI
                />
            )}
        </div>
    );
}

export default VisualRouteEditor;