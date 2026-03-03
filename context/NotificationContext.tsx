import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function notificationsRef(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

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
  read: boolean;
};

type NotificationContextType = {
  notificationsList: StoredNotification[];
  addReceivedNotification: (data: InAppNotification) => void;
  markAsRead: (id: string) => void;
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

function docToStored(docSnap: { id: string; data: () => Record<string, unknown> }): StoredNotification {
  const d = docSnap.data();
  const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date();
  const senderAvatar = d.senderAvatar;
  return {
    id: docSnap.id,
    variant: (d.variant as 'received' | 'sent') ?? 'received',
    chatId: (d.chatId as string) ?? '',
    senderId: (d.senderId as string) ?? '',
    senderName: (d.senderName as string) ?? 'Someone',
    senderAvatar: typeof senderAvatar === 'string' ? senderAvatar : undefined,
    text: (d.text as string) ?? '',
    createdAt,
    read: (d.read as boolean) ?? false,
  };
}

export function NotificationProvider({ user, children }: Props) {
  const [notificationsList, setNotificationsList] = useState<StoredNotification[]>([]);
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
  const initialLoadDone = useRef<Record<string, boolean>>({});
  const listenersByChatId = useRef<Record<string, () => void>>({});

  const setCurrentChatId = useCallback((id: string | null) => setCurrentChatIdState(id), []);

  const clearNotification = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
      } catch (e) {
        console.error('clearNotification', e);
      }
    },
    [user.uid]
  );

  const clearAllNotifications = useCallback(async () => {
    try {
      const ref = notificationsRef(user.uid);
      const snap = await getDocs(ref);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'users', user.uid, 'notifications', d.id))));
    } catch (e) {
      console.error('clearAllNotifications', e);
    }
  }, [user.uid]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
      } catch (e) {
        console.error('markAsRead', e);
      }
    },
    [user.uid]
  );

  const addReceivedNotification = useCallback(
    async (data: InAppNotification) => {
      try {
        await addDoc(notificationsRef(user.uid), {
          variant: data.variant,
          chatId: data.chatId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar ?? null,
          text: data.text,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (e) {
        console.error('addReceivedNotification', e);
      }
    },
    [user.uid]
  );

  const currentChatIdRef = useRef<string | null>(null);
  currentChatIdRef.current = currentChatId;

  // Stream notifications from Firebase (source of truth for list + read status)
  useEffect(() => {
    const ref = notificationsRef(user.uid);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => docToStored(d));
      setNotificationsList(list);
    }, (err) => console.error('notifications onSnapshot', err));
    return () => unsub();
  }, [user.uid]);

  // Message listeners: only add/remove per chat when chat list changes (avoids duplicate on same message)
  useEffect(() => {

    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastUpdate', 'desc')
    );

    const unsubscribeChats = onSnapshot(q, (snap) => {
      const newChatIds = snap.docs.map((d) => d.id);
      const current = listenersByChatId.current;

      // Remove listeners for chats that are no longer in the list
      Object.keys(current).forEach((chatId) => {
        if (!newChatIds.includes(chatId)) {
          current[chatId]();
          delete current[chatId];
        }
      });

      // Add listeners only for new chats we don't have yet
      newChatIds.forEach((chatId) => {
        if (current[chatId]) return;

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

          addReceivedNotification({
            variant: 'received',
            chatId,
            senderId,
            senderName,
            senderAvatar,
            text,
          });
        });

        current[chatId] = unsub;
      });
    }, (err) => {
      console.error('NotificationProvider chats listener error:', err);
    });

    return () => {
      unsubscribeChats();
      Object.values(listenersByChatId.current).forEach((unsub) => unsub());
      listenersByChatId.current = {};
    };
  }, [user.uid, addReceivedNotification]);

  const value: NotificationContextType = {
    notificationsList,
    addReceivedNotification,
    markAsRead,
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
