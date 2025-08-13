import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface NotificationsContextProps {
  unread: number;
  setUnread: (n: number) => void;
}

const NotificationsContext = createContext<NotificationsContextProps>({
  unread: 0,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setUnread: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unread, setUnreadState] = useState(0);

  // Persistir en AsyncStorage para mantener el valor entre sesiones
  useEffect(() => {
    AsyncStorage.getItem('unread_alerts')
      .then(v => {
        if (v !== null) setUnreadState(parseInt(v, 10) || 0);
      })
      .catch(() => {});
  }, []);

  const setUnread = (n: number) => {
    setUnreadState(n);
    AsyncStorage.setItem('unread_alerts', n.toString()).catch(() => {});
  };

  return (
    <NotificationsContext.Provider value={{ unread, setUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
