import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export type InAppNotification = {
  variant: 'received' | 'sent';
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
};

export type StoredNotification = InAppNotification & {
  id: string;
  createdAt: Date;
};

type NotificationContextType = {
  notification: InAppNotification | null;
  notificationsList: StoredNotification[];
  showNotification: (data: InAppNotification) => void;
  hideNotification: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

type Props = { user: User; children: React.ReactNode };

let notificationIdCounter = 0;
function nextId() {
  return `notif_${Date.now()}_${++notificationIdCounter}`;
}

export function NotificationProvider({ user, children }: Props) {
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const [notificationsList, setNotificationsList] = useState<StoredNotification[]>([]);
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
  const initialLoadDone = useRef<Record<string, boolean>>({});
  const unsubscribes = useRef<(() => void)[]>([]);

  const hideNotification = useCallback(() => setNotification(null), []);
  const setCurrentChatId = useCallback((id: string | null) => setCurrentChatIdState(id), []);

  const clearNotification = useCallback((id: string) => {
    setNotificationsList((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotificationsList([]);
  }, []);

  const showNotification = useCallback((data: InAppNotification) => {
    setNotification(data);
    const stored: StoredNotification = {
      ...data,
      id: nextId(),
      createdAt: new Date(),
    };
    setNotificationsList((prev) => [stored, ...prev]);
    // Auto-dismiss toast after 4 seconds
    const t = setTimeout(() => setNotification(n => (n && n.chatId === data.chatId ? null : n)), 4000);
    return () => clearTimeout(t);
  }, []);

  const currentChatIdRef = useRef<string | null>(null);
  currentChatIdRef.current = currentChatId;

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastUpdate', 'desc')
    );

    const unsubscribeChats = onSnapshot(q, (snap) => {
      const chatIds = snap.docs.map((d) => d.id);

      unsubscribes.current.forEach((unsub) => unsub());
      unsubscribes.current = [];

      chatIds.forEach((chatId) => {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const msgQuery = query(
          messagesRef,
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const unsub = onSnapshot(msgQuery, (msgSnap) => {
          if (msgSnap.empty) return;

          const isInitialLoad = !initialLoadDone.current[chatId];
          if (isInitialLoad) {
            initialLoadDone.current[chatId] = true;
            return;
          }

          const doc = msgSnap.docs[0];
          const data = doc.data();
          const senderId = data?.user?._id;
          if (!senderId || senderId === user.uid) return;
          if (currentChatIdRef.current === chatId) return;

          const senderName = data?.user?.name ?? 'Someone';
          const senderAvatar = data?.user?.avatar;
          const text = (data?.text ?? '').trim() || 'New message';

          showNotification({
            variant: 'received',
            chatId,
            senderId,
            senderName,
            senderAvatar,
            text,
          });
        });

        unsubscribes.current.push(unsub);
      });
    }, (err) => {
      console.error('NotificationProvider chats listener error:', err);
    });

    return () => {
      unsubscribeChats();
      unsubscribes.current.forEach((unsub) => unsub());
      unsubscribes.current = [];
    };
  }, [user.uid, showNotification]);

  const value: NotificationContextType = {
    notification,
    notificationsList,
    showNotification,
    hideNotification,
    clearNotification,
    clearAllNotifications,
    currentChatId,
    setCurrentChatId,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
