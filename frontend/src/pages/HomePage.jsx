import React, { useState, useRef, useEffect } from 'react';
import ConversationHistory from '../components/ConversationHistory';
import QueryInputBar from '../components/QueryInputBar';
import AdditionalParametersModal from '../components/AdditionalParametersModal';
import VisualRouteEditor from '../components/VisualRouteEditor'; 

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';
console.log("API Base URL (HomePage):", API_BASE_URL);


const getCurrentUserId = () => {
    const userId = localStorage.getItem('currentUserId');
    return userId ? parseInt(userId, 10) : null;
};

function HomePage() {
  const [conversation, setConversation] = useState([
      { type: 'system', text: 'Привет! Я помогу спланировать твое путешествие. Опиши, что ты хочешь.' },
      { type: 'system', text: 'Не забудь указать дополнительные параметры (даты, бюджет) кнопкой "Параметры".' }
  ]);
  const [currentInputText, setCurrentInputText] = useState('');

  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultStartDate.getDate() + 7);

  const [structuredParams, setStructuredParams] = useState({
      start_date: defaultStartDate.toISOString().split('T')[0],
      end_date: defaultEndDate.toISOString().split('T')[0],
      budget: null,
      budget_currency: 'RUB',
  });

  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [awaitingClarificationField, setAwaitingClarificationField] = useState(null);
  const [originalQueryText, setOriginalQueryText] = useState('');

  
  const [routeBeingEdited, setRouteBeingEdited] = useState(null); 

  const sendQuery = async (queryData) => {
      setIsLoading(true);
      
      
      setConversation(prev => prev.filter(msg => msg.type !== 'system_route'));

      console.log("HomePage.jsx - sendQuery - queryData to be sent:", JSON.stringify(queryData, null, 2));

      const userId = getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };

      if (userId !== null) {
          headers['X-User-ID'] = userId.toString();
      } else {
          console.warn("Attempting to send query for null user ID. User is likely not logged in.");
          setConversation(prev => [...prev, { type: 'system', text: 'Ошибка: Пользователь не авторизован.', isError: true }]);
          setIsLoading(false);
          return;
      }

      try {
          const response = await fetch(`${API_BASE_URL}/queries/`, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(queryData),
          });

          const responseData = await response.json();

          if (response.ok) {
              if (responseData.status === 'clarification_required' && responseData.missing_fields) {
                  const missingField = responseData.missing_fields[0];
                  let clarificationMsg = responseData.message || `Пожалуйста, уточните ${missingField}.`;
                  if (missingField === 'destination') {
                      clarificationMsg = 'А где бы вы хотели отдохнуть?';
                  }
                  setAwaitingClarificationField(missingField);
                  setConversation(prev => [...prev, { type: 'system', text: clarificationMsg }]);
                  
                  
              } else {
                  console.log("Route generated successfully:", responseData);
                  
                  
                  const routeWithFinalizedFlag = { 
                    ...responseData, 
                    is_finalized: responseData.is_finalized || false 
                  };
                  setConversation(prev => [...prev, { type: 'system', text: 'Ваш маршрут сгенерирован!' }]);
                  setConversation(prev => [...prev, { type: 'system_route', data: routeWithFinalizedFlag }]);
                  setAwaitingClarificationField(null);
                  setOriginalQueryText('');
              }
          } else {
              let errorMessage = responseData.detail || `Ошибка: ${response.status}`;
              if (typeof errorMessage === 'object') {
                   errorMessage = 'Ошибка валидации данных: ' + Object.entries(errorMessage).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
              }
              setConversation(prev => [...prev, { type: 'system', text: `Ошибка: ${errorMessage}`, isError: true }]);
              setAwaitingClarificationField(null);
              setOriginalQueryText('');
              console.error("Backend error:", responseData);
          }

      } catch (err) {
          setConversation(prev => [...prev, { type: 'system', text: `Ошибка сети: ${err.message}`, isError: true }]);
          setAwaitingClarificationField(null);
          setOriginalQueryText('');
          console.error("Fetch error:", err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleTextInputSubmit = (text) => {
      const inputText = text.trim();
      if (!inputText && !awaitingClarificationField) { 
          return;
      }

      
      if (inputText) {
         setConversation(prev => [...prev, { type: 'user', text: inputText }]);
      }
      setCurrentInputText(''); 

      let dataToSend;

      if (awaitingClarificationField === 'destination') {
          if (!inputText) { 
               setConversation(prev => [...prev, { type: 'system', text: 'Пожалуйста, введите место назначения.', isError: true }]);
               return; 
          }
          dataToSend = {
              query_text: originalQueryText, 
              start_date: structuredParams.start_date,
              end_date: structuredParams.end_date,
              budget: structuredParams.budget,
              budget_currency: structuredParams.budget_currency,
              destination: [inputText], 
          };
          setAwaitingClarificationField(null); 
          
          
          
      } else {
          
          if (!inputText) return; 
          setOriginalQueryText(inputText); 
          dataToSend = {
              query_text: inputText,
              start_date: structuredParams.start_date,
              end_date: structuredParams.end_date,
              budget: structuredParams.budget,
              budget_currency: structuredParams.budget_currency,
              destination: [], 
          };
          setAwaitingClarificationField(null);
      }
      sendQuery(dataToSend);
  };

  const handleParamsSaved = (paramsFromModal) => { 
      setStructuredParams(paramsFromModal);
      setIsParamsModalOpen(false);
       setConversation(prev => [...prev, { type: 'system', text: `Параметры обновлены: Даты (${paramsFromModal.start_date} - ${paramsFromModal.end_date}), Бюджет (${paramsFromModal.budget === null ? 'Неограничен' : `${paramsFromModal.budget} ${paramsFromModal.budget_currency}`}).` }]);
  };

  const messagesEndRef = useRef(null);
  useEffect(() => {
    console.log("Conversation updated:", conversation);
    const lastRouteMsg = conversation.slice().reverse().find(msg => msg.type === 'system_route');
    if (lastRouteMsg) {
        console.log("Last route message data:", lastRouteMsg.data);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);


  const handleFinalizeRoute = async (routeId) => {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error("User not authenticated to finalize route");
        setConversation(prev => [...prev, { type: 'system', text: 'Ошибка: Вы не авторизованы для этого действия.', isError: true }]);
        return;
    }
    console.log(`Finalizing route ID: ${routeId} for user ID: ${userId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/routes/${routeId}/finalize`, {
            method: 'POST',
            headers: {
                'X-User-ID': userId.toString(),
            }
        });
        
        const updatedRouteData = await response.json(); 

        if (!response.ok) {
            
            const errorDetail = updatedRouteData?.detail || `Failed to finalize route. Status: ${response.status}`;
            throw new Error(errorDetail);
        }

        
        setConversation(prevConversation =>
            prevConversation.map(msg => {
                if (msg.type === 'system_route' && msg.data.route_id === routeId) {
                    
                    return { ...msg, data: { ...updatedRouteData } }; 
                }
                return msg;
            })
        );
        
        setConversation(prev => [...prev, { type: 'system', text: `Маршрут (ID: ${routeId}) утвержден!` }]);

    } catch (error) {
        console.error("Error finalizing route:", error);
        setConversation(prev => [...prev, { type: 'system', text: `Ошибка утверждения маршрута: ${error.message}`, isError: true }]);
    } finally {
        
    }
  };

  
  const handleEditRouteRequest = (routeDataToEdit) => {
    console.log("User wants to edit route (HomePage):", routeDataToEdit);
    setRouteBeingEdited(routeDataToEdit); 
  };

  
  const handleEditorSaveChanges = (updatedRouteDataFromEditor) => {
    setConversation(prevConversation =>
        prevConversation.map(msg => {
            if (msg.type === 'system_route' && msg.data.route_id === updatedRouteDataFromEditor.route_id) {
                return { ...msg, data: updatedRouteDataFromEditor }; 
            }
            return msg;
        })
    );
    setRouteBeingEdited(null); 
    setConversation(prev => [...prev, { type: 'system', text: `Маршрут (ID: ${updatedRouteDataFromEditor.route_id}) обновлен. Нажмите "Мне всё нравится", чтобы утвердить.` }]);
  };

  
  const handleEditorCancel = () => {
    setRouteBeingEdited(null); 
  };

  return (
    <div className="home-page-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 71px - 40px)', 
                                            
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
    }}>
        {routeBeingEdited ? (
            <VisualRouteEditor
                initialRouteData={routeBeingEdited}
                onSaveChanges={handleEditorSaveChanges}
                onCancelEdit={handleEditorCancel}
            />
        ) : (
            <> 
                <div className="conversation-area" style={{
                    overflowX: 'hidden',
                    flexGrow: 1,
                    overflowY: 'auto',
                    marginBottom: '15px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: 'var(--background-conversation)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--box-shadow-soft)'
                }}>
                    <ConversationHistory
                        conversation={conversation}
                        onFinalizeRoute={handleFinalizeRoute}
                        onEditRouteRequest={handleEditRouteRequest}
                    />
                    {isLoading && <div style={{ alignSelf: 'flex-start', color: '#888', fontStyle: 'italic', margin: '5px 12px' }}>Система думает...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area" style={{
                     flexShrink: 0,
                     padding: '15px 20px',
                     borderTop: '1px solid #eee',
                     backgroundColor: 'var(--background-input-area)',
                     boxShadow: '0 -2px 5px rgba(0,0,0,0.04)',
                }}>
                    <QueryInputBar
                        currentInputText={currentInputText}
                        onInputChange={setCurrentInputText}
                        onSubmitText={handleTextInputSubmit}
                        onOpenParams={() => setIsParamsModalOpen(true)}
                        isLoading={isLoading}
                    />
                </div>

                {isParamsModalOpen && (
                    <AdditionalParametersModal
                        onSave={handleParamsSaved}
                        onCancel={() => setIsParamsModalOpen(false)}
                        initialParams={structuredParams} 
                    />
                )}
            </>
        )}
    </div>
  );
}

export default HomePage;