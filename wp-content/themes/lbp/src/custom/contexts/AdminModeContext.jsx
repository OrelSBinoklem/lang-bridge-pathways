import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Контекст для управления режимом админа
 * 
 * Режим админа позволяет показывать админские элементы (кнопки редактирования, управление словами)
 * только когда пользователь является админом И включил режим админа через специальную кнопку.
 */
const AdminModeContext = createContext();

export const AdminModeProvider = ({ children }) => {
  const [isAdminModeEnabled, setIsAdminModeEnabled] = useState(false);
  
  // Проверяем, является ли пользователь админом
  const isAdmin = window.myajax && window.myajax.is_admin;
  
  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    if (isAdmin) {
      const saved = localStorage.getItem('adminModeEnabled');
      if (saved === 'true') {
        setIsAdminModeEnabled(true);
      }
    }
  }, [isAdmin]);
  
  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('adminModeEnabled', isAdminModeEnabled.toString());
    }
  }, [isAdminModeEnabled, isAdmin]);
  
  const toggleAdminMode = () => {
    if (isAdmin) {
      setIsAdminModeEnabled(prev => !prev);
    }
  };
  
  // Режим админа активен только если пользователь админ И режим включен
  const isAdminModeActive = isAdmin && isAdminModeEnabled;
  
  return (
    <AdminModeContext.Provider value={{
      isAdmin,
      isAdminModeEnabled,
      isAdminModeActive,
      toggleAdminMode
    }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (!context) {
    throw new Error('useAdminMode must be used within AdminModeProvider');
  }
  return context;
};

