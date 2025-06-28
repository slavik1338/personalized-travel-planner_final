import React, { useState, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://127.0.0.1:8000';
console.log("API Base URL used in QueryForm:", API_BASE_URL);

function QueryForm() {
  const [conversation, setConversation] = useState([
      { type: 'system', text: 'Привет! Я помогу спланировать твое путешествие. Опиши, что ты хочешь.' },
      { type: 'system', text: 'Не забудь указать дополнительные параметры (даты, бюджет) кнопкой "Параметры".' }
  ]);
  const [currentInputText, setCurrentInputText] = useState('');

  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultStartDate.getDate() + 7);

  const [structuredParams, setStructuredParams] = useState({
      startDate: defaultStartDate.toISOString().split('T')[0],
      endDate: defaultEndDate.toISOString().split('T')[0],
      budget: null,
      budgetCurrency: 'RUB',
  });

  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingClarificationField, setAwaitingClarificationField] = useState(null);
  const [originalQueryText, setOriginalQueryText] = useState('');
  const [generatedRoute, setGeneratedRoute] = useState(null); 


  const sendQueryToBackend = async (queryData) => {
      setIsLoading(true);

      console.log("Sending query:", queryData);

      try {
          const response = await fetch(`${API_BASE_URL}/queries/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
                  setOriginalQueryText(queryData.query_text); 
                  setGeneratedRoute(null); 
              } else {
                  console.log("Route generated successfully:", responseData);
                  setGeneratedRoute(responseData); 
                  setConversation(prev => [...prev, { type: 'system', text: 'Ваш маршрут сгенерирован!' }]);
                  setConversation(prev => [...prev, { type: 'system_route', data: responseData }]);
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
              setGeneratedRoute(null);
              console.error("Backend error:", responseData);
          }

      } catch (err) {
          setConversation(prev => [...prev, { type: 'system', text: `Ошибка сети: ${err.message}`, isError: true }]);
          setAwaitingClarificationField(null);
          setOriginalQueryText('');
          setGeneratedRoute(null);
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
               setConversation(prev => [...prev, { type: 'system', text: 'Пожалуйста, введите место назначения.' }]);
               return;
          }
          dataToSend = {
              query_text: originalQueryText,
              start_date: structuredParams.startDate,
              endDate: structuredParams.endDate,
              budget: structuredParams.budget,
              budget_currency: structuredParams.budgetCurrency,
              destination: [inputText],
          };
          setAwaitingClarificationField(null);
          setOriginalQueryText('');

      } else {
          setOriginalQueryText(inputText);
          dataToSend = {
              query_text: inputText,
              start_date: structuredParams.startDate,
              endDate: structuredParams.endDate,
              budget: structuredParams.budget,
              budget_currency: structuredParams.budgetCurrency,
              destination: [],
          };
          setAwaitingClarificationField(null);
          setGeneratedRoute(null);
      }

      sendQuery(dataToSend);
  };

  const handleParamsSaved = (params) => {
      setStructuredParams(params);
      setIsParamsModalOpen(false);
       setConversation(prev => [...prev, { type: 'system', text: `Параметры обновлены: Даты (${params.startDate} - ${params.endDate}), Бюджет (${params.budget === null ? 'Неограничен' : `${params.budget} ${params.budgetCurrency}`}).` }]);
  };


  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isLoading]);


  return (
    <div className="app-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: 'sans-serif',
        padding: '0 20px 20px 20px',
        boxSizing: 'border-box',
    }}>
        <h1 style={{ textAlign: 'center', margin: '20px 0' }}>Система Построения Персонализированных Маршрутов</h1>

        <div className="conversation-area" style={{
            flexGrow: 1,
            overflowY: 'auto',
            marginBottom: '10px',
            border: '1px solid #eee',
            borderRadius: '8px',
            padding: '10px',
            backgroundColor: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <ConversationHistory conversation={conversation} />
            {isLoading && <div style={{ alignSelf: 'flex-start', color: '#888', fontStyle: 'italic', margin: '5px 12px' }}>Система думает...</div>}
            <div ref={messagesEndRef} />
        </div>

        <div className="input-area" style={{
             flexShrink: 0,
             paddingTop: '10px',
             borderTop: '1px solid #eee',
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

    </div>
  );
}

export default QueryForm;

function ConversationHistory({ conversation }) {
    const renderMessage = (item, index) => {
        if (item.type === 'user') {
            return (
                <div key={index} style={{ alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', borderRadius: '15px', padding: '8px 12px', margin: '5px 0', maxWidth: '80%', wordBreak: 'break-word' }}>
                    {item.text}
                </div>
            );
        } else if (item.type === 'system') {
             const messageStyle = {
                 alignSelf: 'flex-start',
                 backgroundColor: item.isError ? '#f8d7da' : '#e9e9eb',
                 color: item.isError ? '#721c24' : '#333',
                 borderRadius: '15px',
                 padding: '8px 12px',
                 margin: '5px 0',
                 maxWidth: '80%',
                 wordBreak: 'break-word'
             };
             return (
                 <div key={index} style={messageStyle}>
                     {item.text}
                 </div>
             );
        } else if (item.type === 'system_route') {
             const route = item.data;
             return (
                 <div key={index} style={{ alignSelf: 'flex-start', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '12px', margin: '10px 0', maxWidth: '90%', overflowX: 'hidden', wordBreak: 'break-word' }}>
                     <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>Маршрут сгенерирован!</h4>
                     <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#155724' }}>
                         <strong>Примерная стоимость:</strong> {route.total_cost?.toFixed(2)} {route.total_cost_currency}
                     </p>
                     <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#155724' }}>
                         <strong>Длительность:</strong> {route.duration_days} дней
                     </p>
                     <pre style={{
                         whiteSpace: 'pre-wrap',
                         wordWrap: 'break-word',
                         backgroundColor: '#c3e6cb',
                         padding: '10px',
                         borderRadius: '4px',
                         border: '1px solid #a3daab',
                         fontSize: '0.9em',
                         color: '#333',
                         maxHeight: '300px',
                         overflowY: 'auto',
                         marginTop: '10px',
                     }}>
                         {route.route_text}
                     </pre>
                 </div>
             );
        }
        return null;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {conversation.map(renderMessage)}
      </div>
    );
}

function QueryInputBar({ currentInputText, onInputChange, onSubmitText, onOpenParams, isLoading }) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmitText(currentInputText);
        }
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <textarea
              value={currentInputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "Система думает..." : "Введите ваше сообщение..."}
              rows={1}
              disabled={isLoading}
              style={{
                  flexGrow: 1,
                  padding: '10px',
                  borderRadius: '20px',
                  border: '1px solid #ccc',
                  resize: 'none',
                  overflowY: 'hidden',
                  maxHeight: '100px',
                  fontSize: '1em',
              }}
          />
          <button
              onClick={() => onSubmitText(currentInputText)}
              disabled={isLoading || !currentInputText.trim()}
              style={{
                  padding: '10px 15px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1em',
                  flexShrink: 0,
                  transition: 'background-color 0.3s ease',
              }}
          >
              Отправить
          </button>
          <button
              onClick={onOpenParams}
              disabled={isLoading}
              style={{
                   padding: '10px 15px',
                   borderRadius: '20px',
                   border: 'none',
                   backgroundColor: '#6c757d',
                   color: 'white',
                   cursor: 'pointer',
                   fontSize: '1em',
                   flexShrink: 0,
                   transition: 'background-color 0.3s ease',
               }}
          >
              Параметры
          </button>
      </div>
    );
}


function AdditionalParametersModal({ onSave, onCancel, initialParams }) {
    const defaultStartDate = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultStartDate.getDate() + 7);

    const [startDate, setStartDate] = useState(initialParams?.startDate || defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(initialParams?.endDate || defaultEndDate.toISOString().split('T')[0]);
    const [budget, setBudget] = useState(initialParams?.budget ?? '');
    const [budgetCurrency, setBudgetCurrency] = useState(initialParams?.budgetCurrency || 'RUB');

    const availableCurrencies = ['RUB', 'USD', 'EUR', 'GBP'];


    const handleSave = (e) => {
      e.preventDefault();
      const paramsToSave = {
        startDate: startDate,
        endDate: endDate,
        budget: budget ? parseFloat(budget) : null,
        budgetCurrency: budgetCurrency,
      };
      onSave(paramsToSave);
    };


    const modalStyle = {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    };

    const formStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    };

    const buttonRowStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
    };

    const buttonStyle = {
        padding: '10px 15px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1em',
    };


    return (
      <div style={modalStyle}>
        <div style={modalContentStyle}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Дополнительные параметры</h2>
          <form style={formStyle} onSubmit={handleSave}>
            <label style={{ fontWeight: 'bold', color: '#333' }}> 
              Дата начала:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }} 
              />
            </label>

            <label style={{ fontWeight: 'bold', color: '#333' }}> 
              Дата окончания:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }} 
              />
            </label>

            <label style={{ fontWeight: 'bold', color: '#333' }}> 
              Бюджет:
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
                placeholder="Например: 50000"
                style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
              />
            </label>

             <label style={{ fontWeight: 'bold', color: '#333' }}> 
               Валюта бюджета:
               <select
                 value={budgetCurrency}
                 onChange={(e) => setBudgetCurrency(e.target.value)}
                 style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }} 
               >
                 {availableCurrencies.map(currency => (
                   <option key={currency} value={currency}>{currency}</option>
                 ))}
               </select>
             </label>


            <div style={buttonRowStyle}>
              <button type="button" onClick={onCancel} style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white' }}>
                Отмена
              </button>
              <button type="submit" style={{ ...buttonStyle, backgroundColor: '#28a745', color: 'white' }}>
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    );
}