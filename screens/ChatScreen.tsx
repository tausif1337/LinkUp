import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { GiftedChat, IMessage, Send, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { ChevronLeft, Send as SendIcon } from 'lucide-react-native';

type Props = {
    user: User;
    recipient: {
        uid: string;
        displayName: string;
        photoURL?: string;
    };
    onNavigate: (screen: any, params?: any) => void;
};

export default function ChatScreen({ user, recipient, onNavigate }: Props) {
    const [messages, setMessages] = useState<IMessage[]>([]);

    const chatId = [user.uid, recipient.uid].sort().join('_');

    useEffect(() => {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    _id: doc.id,
                    text: data.text,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    user: data.user,
                } as IMessage;
            });
            setMessages(allMessages);
        });

        return unsubscribe;
    }, [chatId]);

    const onSend = useCallback(async (newMessages: IMessage[] = []) => {
        const { _id, createdAt, text, user: messageUser } = newMessages[0];

        try {
            // Add message to subcollection
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                _id,
                text,
                createdAt: serverTimestamp(),
                user: messageUser,
            });

            // Update/Create chat document for recent conversations
            const chatRef = doc(db, 'chats', chatId);
            await setDoc(chatRef, {
                participants: [user.uid, recipient.uid],
                participantDetails: {
                    [user.uid]: {
                        displayName: user.displayName || 'User',
                        photoURL: user.photoURL || '',
                    },
                    [recipient.uid]: {
                        displayName: recipient.displayName,
                        photoURL: recipient.photoURL || '',
                    }
                },
                lastMessage: text,
                lastUpdate: serverTimestamp(),
                users: [user.uid, recipient.uid], // For easier querying
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    }, [chatId, user, recipient]);

    const renderSend = (props: any) => {
        return (
            <Send {...props} containerStyle={styles.sendContainer}>
                <View style={styles.sendButton}>
                    <SendIcon size={20} color="#fff" fill="#fff" />
                </View>
            </Send>
        );
    };

    const renderBubble = (props: any) => {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: Theme.colors.primary,
                        borderRadius: Theme.borderRadius.lg,
                        padding: 4,
                    },
                    left: {
                        backgroundColor: '#F1F5F9',
                        borderRadius: Theme.borderRadius.lg,
                        padding: 4,
                    },
                }}
                textStyle={{
                    right: {
                        color: '#fff',
                        fontFamily: Theme.fonts.regular,
                    },
                    left: {
                        color: Theme.colors.text,
                        fontFamily: Theme.fonts.regular,
                    },
                }}
            />
        );
    };

    const renderInputToolbar = (props: any) => {
        return (
            <InputToolbar
                {...props}
                containerStyle={styles.inputToolbar}
                primaryStyle={{ alignItems: 'center' }}
            />
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => onNavigate('Messages')} style={styles.backButton}>
                    <ChevronLeft size={24} color={Theme.colors.text} />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{recipient.displayName}</Text>
                    <Text style={styles.headerStatus}>Online</Text>
                </View>
            </View>

            <GiftedChat
                messages={messages}
                onSend={messages => onSend(messages)}
                user={{
                    _id: user.uid,
                    name: user.displayName || 'You',
                    avatar: user.photoURL || '',
                }}
                renderSend={renderSend}
                renderBubble={renderBubble}
                renderInputToolbar={renderInputToolbar}
                textInputProps={{
                    placeholder: "Type a message...",
                }}
                isSendButtonAlwaysVisible
            />
            {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        backgroundColor: Theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    backButton: {
        padding: Theme.spacing.xs,
        marginRight: Theme.spacing.sm,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
    },
    headerStatus: {
        fontSize: 12,
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.secondary,
    },
    sendContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: Theme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputToolbar: {
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        backgroundColor: Theme.colors.surface,
        paddingTop: 4,
    },
});
