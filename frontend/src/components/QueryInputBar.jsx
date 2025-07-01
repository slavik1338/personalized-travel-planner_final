import React, { useState } from 'react';

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
                padding: '10px 20px',
                borderRadius: 'var(--border-radius-md)',
                border: 'none',
                backgroundColor: 'var(--pastel-primary)',  
                color: 'var(--text-on-pastel-primary)',
                cursor: 'pointer',
                fontSize: '1em',
                fontWeight: '500',
                flexShrink: 0, 
                transition: 'background-color 0.3s ease',
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--pastel-primary-darker, #8aabbf)';
                    e.currentTarget.style.boxShadow = 'var(--box-shadow-medium, 0 2px 5px rgba(0,0,0,0.08))';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--pastel-primary, #a7c7e7)';
                    e.currentTarget.style.boxShadow = 'var(--box-shadow-soft, 0 1px 3px rgba(0,0,0,0.04))';
                }}
        >
            Отправить
        </button>
        <button
            onClick={onOpenParams} 
            disabled={isLoading} 
            style={{
                 padding: '12px 22px',
                 borderRadius: 'var(--border-radius-md, 10px)',
                 border: 'none', 
                 backgroundColor: 'var(--pastel-info, #b2dfdb)', 
                 color: 'var(--text-on-pastel-info, #004d40)',    
                 cursor: isLoading ? 'not-allowed' : 'pointer',
                 fontSize: '1em',
                 fontWeight: '500',
                 boxShadow: 'var(--box-shadow-soft, 0 2px 4px rgba(0,0,0,0.05))',
                 transition: 'background-color 0.2s, box-shadow 0.2s',
             }}
        >
            Параметры
        </button>
    </div>
  );
}

export default QueryInputBar;