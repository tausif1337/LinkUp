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

/**
 * Helper to get the reference to the user's notifications collection.
 */
function getNotificationsRef(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

// --- TYPES ---

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

// --- CONTEXT & HOOK ---

const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * Hook to easily access notification data and actions anywhere in the app.
 */
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

// --- HELPERS ---

/**
 * Converts a Firestore document snapshot into a clean StoredNotification object.
 */
function mapDocToNotification(docSnap: { id: string; data: () => Record<string, any> }): StoredNotification {
  const data = docSnap.data();
  
  return {
    id: docSnap.id,
    variant: data.variant ?? 'received',
    chatId: data.chatId ?? '',
    senderId: data.senderId ?? '',
    senderName: data.senderName ?? 'Someone',
    senderAvatar: typeof data.senderAvatar === 'string' ? data.senderAvatar : undefined,
    text: data.text ?? '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    read: data.read ?? false,
  };
}

// --- PROVIDER ---

type Props = { user: User; children: React.ReactNode };

/**
 * NotificationProvider manages the in-app notification system.
 * It listens for new messages in all active chats and stores them as notifications
 * if the user isn't currently looking at that specific chat.
 */
export function NotificationProvider({ user, children }: Props) {
  const [notificationsList, setNotificationsList] = useState<StoredNotification[]>([]);
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);

  // We use Refs to store values that we need inside listeners without triggering unnecessary re-renders
  // or dealing with "stale closures" (using old values of state inside a long-running function).
  const initialLoadDone = useRef<Record<string, boolean>>({});
  const activeMessageListeners = useRef<Record<string, () => void>>({});
  const currentChatIdRef = useRef<string | null>(null);

  // Update the ref whenever the state changes
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  const setCurrentChatId = useCallback((id: string | null) => setCurrentChatIdState(id), []);

  /**
   * Remove a single notification by its ID
   */
  const clearNotification = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
      } catch (e) {
        console.error('Error clearing notification:', e);
      }
    },
    [user.uid]
  );

  /**
   * Remove all notifications for the current user
   */
  const clearAllNotifications = useCallback(async () => {
    try {
      const ref = getNotificationsRef(user.uid);
      const snap = await getDocs(ref);
      
      // Batch delete all found notifications
      const deletions = snap.docs.map((d) => 
        deleteDoc(doc(db, 'users', user.uid, 'notifications', d.id))
      );
      await Promise.all(deletions);
    } catch (e) {
      console.error('Error clearing all notifications:', e);
    }
  }, [user.uid]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
      } catch (e) {
        console.error('Error marking notification as read:', e);
      }
    },
    [user.uid]
  );

  /**
   * Add a new notification manually (usually called internally when a message is received)
   */
  const addReceivedNotification = useCallback(
    async (data: InAppNotification) => {
      try {
        await addDoc(getNotificationsRef(user.uid), {
          ...data,
          senderAvatar: data.senderAvatar ?? null,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (e) {
        console.error('Error adding notification:', e);
      }
    },
    [user.uid]
  );

  /**
   * EFFECT 1: Sync the notifications list from Firestore.
   * This is our "Source of Truth" for what appears in the notification drawer.
   */
  useEffect(() => {
    const ref = getNotificationsRef(user.uid);
    const q = query(ref, orderBy('createdAt', 'desc'));
    
    // Subscribe to live updates
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => mapDocToNotification(d));
      setNotificationsList(list);
    }, (err) => console.error('Firestore sync error:', err));

    return () => unsubscribe();
  }, [user.uid]);

  /**
   * EFFECT 2: Listen for new messages in all chats.
   * This logic is split:
   * 1. Find all chats the user is part of.
   * 2. For each chat, listen for the *latest* message.
   * 3. If a new message arrives and the user isn't in that chat, show a notification.
   */
  useEffect(() => {
    // 1. Get all chats for this user
    const chatsQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastUpdate', 'desc')
    );

    const unsubscribeChats = onSnapshot(chatsQuery, (snap) => {
      const activeIds = snap.docs.map((d) => d.id);
      const listeners = activeMessageListeners.current;

      // Clean up listeners for chats that were removed (if any)
      Object.keys(listeners).forEach((chatId) => {
        if (!activeIds.includes(chatId)) {
          listeners[chatId](); // Stop listening
          delete listeners[chatId];
        }
      });

      // Set up listeners for newly discovered chats
      activeIds.forEach((chatId) => {
        if (listeners[chatId]) return; // Already listening, skip

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const lastMessageQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

        const stopListening = onSnapshot(lastMessageQuery, (msgSnap) => {
          if (msgSnap.empty) return;

          // LOGIC: Skip the very first message detected on load.
          // We only want to notify about messages that arrive *after* we start listening.
          if (!initialLoadDone.current[chatId]) {
            initialLoadDone.current[chatId] = true;
            return;
          }

          const doc = msgSnap.docs[0];
          const msgData = doc.data();
          const senderId = msgData?.user?._id;

          // LOGIC: Don't notify if:
          // - We sent the message ourself
          // - We are currently looking at this chat (tracked by currentChatIdRef)
          if (!senderId || senderId === user.uid) return;
          if (currentChatIdRef.current === chatId) return;

          // If all checks pass, add a notification record to the user's list
          addReceivedNotification({
            variant: 'received',
            chatId,
            senderId,
            senderName: msgData?.user?.name ?? 'Someone',
            senderAvatar: msgData?.user?.avatar,
            text: (msgData?.text ?? '').trim() || 'New message',
          });
        });

        listeners[chatId] = stopListening;
      });
    }, (err) => {
      console.error('Chat discovery error:', err);
    });

    // Cleanup: Stop all listeners when the component unmounts or user changes
    return () => {
      unsubscribeChats();
      Object.values(activeMessageListeners.current).forEach((stop) => stop());
      activeMessageListeners.current = {};
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

