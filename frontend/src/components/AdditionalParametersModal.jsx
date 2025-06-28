import React, { useState } from 'react';

function AdditionalParametersModal({ onSave, onCancel, initialParams }) {
    const defaultStartDate = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultStartDate.getDate() + 7);


    const [start_date, setStartDate] = useState(initialParams?.start_date || defaultStartDate.toISOString().split('T')[0]);
    const [end_date, setEndDate] = useState(initialParams?.end_date || defaultEndDate.toISOString().split('T')[0]);
    const [budget, setBudget] = useState(initialParams?.budget ?? '');
    const [budget_currency, setBudgetCurrency] = useState(initialParams?.budget_currency || 'RUB');

    const availableCurrencies = ['RUB', 'USD', 'EUR', 'GBP'];


    const handleSave = (e) => {
      e.preventDefault();
      const paramsToSave = {
        start_date: start_date, 
        end_date: end_date,     
        budget: budget === '' ? null : parseFloat(budget),
        budget_currency: budget_currency, 
      };
      onSave(paramsToSave); 
    };


    const modalStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: 'white', padding: '30px', borderRadius: '8px',
        maxWidth: '500px', width: '90%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: '#333',
    };

    const formStyle = {
        display: 'flex', flexDirection: 'column', gap: '15px',
    };

    const buttonRowStyle = {
        display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px',
    };

    const buttonStyle = {
        padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '1em',
    };

    const labelStyle = {
        fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px',
    };

     const inputStyle = {
         marginLeft: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', color: '#333'
     };


    return (
      <div style={modalStyle}>
        <div style={modalContentStyle}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Дополнительные параметры</h2>
          <form style={formStyle} onSubmit={handleSave}>
            <label style={labelStyle}>
              Дата начала:
              <input
                type="date"
                value={start_date} 
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Дата окончания:
              <input
                type="date"
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
                required
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Бюджет:
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
                placeholder="Например: 50000"
                style={inputStyle}
              />
            </label>

             <label style={labelStyle}>
               Валюта бюджета:
               <select
                 value={budget_currency}
                 onChange={(e) => setBudgetCurrency(e.target.value)}
                 style={inputStyle}
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

export default AdditionalParametersModal;