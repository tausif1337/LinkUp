import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Send, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { ChevronLeft, Send as SendIcon, Info, User as UserIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInRight, FadeInLeft, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// --- Sub-components to comply with Rules of Hooks ---

const CustomSend = memo(({ sendButtonScale, ...props }: any) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sendButtonScale.value }]
    }));

    return (
        <Send {...props} isSendButtonAlwaysVisible containerStyle={styles.sendContainer}>
            <Animated.View style={[styles.sendButton, animatedStyle]}>
                <SendIcon size={20} color="#fff" fill="#fff" />
            </Animated.View>
        </Send>
    );
});

const CustomBubble = memo(({ userUid, ...props }: any) => {
    const isSelf = props.currentMessage.user._id === userUid;

    return (
        <Animated.View
            entering={isSelf ? FadeInRight.springify() : FadeInLeft.springify()}
            style={{ marginBottom: 4 }}
        >
            {isSelf ? (
                <LinearGradient
                    colors={[Theme.colors.primary, '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.bubbleWrapper,
                        {
                            borderTopLeftRadius: 22,
                            borderTopRightRadius: 22,
                            borderBottomLeftRadius: 22,
                            borderBottomRightRadius: 6,
                        }
                    ]}
                >
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: 'transparent', margin: 0, padding: 0 },
                            left: { backgroundColor: 'transparent', margin: 0, padding: 0 }
                        }}
                        textStyle={{
                            right: { color: '#fff', fontFamily: Theme.fonts.regular, fontSize: 16, lineHeight: 22 },
                            left: { color: Theme.colors.text, fontFamily: Theme.fonts.regular, fontSize: 16, lineHeight: 22 }
                        }}
                        timeTextStyle={{
                            right: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
                            left: { color: Theme.colors.textMuted, fontSize: 11 }
                        }}
                    />
                </LinearGradient>
            ) : (
                <View style={[
                    styles.bubbleWrapper,
                    {
                        backgroundColor: '#FFFFFF',
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        borderBottomLeftRadius: 6,
                        borderBottomRightRadius: 22,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 8,
                        elevation: 2,
                    }
                ]}>
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: 'transparent', margin: 0, padding: 0 },
                            left: { backgroundColor: 'transparent', margin: 0, padding: 0 }
                        }}
                        textStyle={{
                            right: { color: '#fff', fontFamily: Theme.fonts.regular, fontSize: 16, lineHeight: 22 },
                            left: { color: Theme.colors.text, fontFamily: Theme.fonts.regular, fontSize: 16, lineHeight: 22 }
                        }}
                        timeTextStyle={{
                            right: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
                            left: { color: Theme.colors.textMuted, fontSize: 11 }
                        }}
                    />
                </View>
            )}
        </Animated.View>
    );
});

const CustomInputToolbar = memo((props: any) => {
    return (
        <InputToolbar
            {...props}
            containerStyle={styles.inputToolbar}
            primaryStyle={{ alignItems: 'center' }}
        />
    );
});

type Props = {
    user: User;
    route: any;
    navigation: any;
};

export default function ChatScreen({ user, route, navigation }: Props) {
    const { recipient } = route.params;
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isTyping] = useState(false);
    const insets = useSafeAreaInsets();
    const sendButtonScale = useSharedValue(1);

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
        const { _id, text, user: messageUser } = newMessages[0];

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                _id,
                text,
                createdAt: serverTimestamp(),
                user: messageUser,
            });

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
                users: [user.uid, recipient.uid],
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    }, [chatId, user, recipient]);

    return (
        <View style={styles.container}>
            <View style={styles.backgroundGradient} />

            <GiftedChat
                messages={messages}
                onSend={messages => onSend(messages)}
                user={{
                    _id: user.uid,
                    name: user.displayName || 'You',
                    avatar: user.photoURL || '',
                }}
                renderSend={(props) => <CustomSend {...props} sendButtonScale={sendButtonScale} />}
                renderBubble={(props) => <CustomBubble {...props} userUid={user.uid} />}
                renderInputToolbar={(props) => <CustomInputToolbar {...props} />}
                renderAvatar={null}
                renderFooter={() => isTyping ? (
                    <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>{recipient.displayName} is typing...</Text>
                    </View>
                ) : null}
                textInputProps={{
                    placeholder: "Message...",
                    style: styles.textInput,
                    placeholderTextColor: Theme.colors.textMuted,
                    onFocus: () => {
                        sendButtonScale.value = withSpring(1.2);
                    },
                    onBlur: () => { sendButtonScale.value = withSpring(1); },
                }}
                minInputToolbarHeight={80}
                maxComposerHeight={100}
                listProps={{
                    contentContainerStyle: {
                        paddingBottom: 24,
                        paddingTop: insets.top + 80,
                    }
                }}
            />

            {/* Floating Glassmorphism Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.headerContent}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={26} color={Theme.colors.text} />
                    </Pressable>
                    <View style={styles.headerUser}>
                        <View style={styles.avatarWrapper}>
                            {recipient.photoURL ? (
                                <Image source={{ uri: recipient.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholderAvatar]}>
                                    <UserIcon size={20} color={Theme.colors.primary} />
                                </View>
                            )}
                            <View style={styles.statusDot} />
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{recipient.displayName}</Text>
                            <Text style={styles.headerStatus}>Online</Text>
                        </View>
                    </View>
                    <Pressable style={styles.iconButton}>
                        <Info size={22} color={Theme.colors.textSecondary} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerUser: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: '#fff',
    },
    placeholderAvatar: {
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        backgroundColor: '#10B981',
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    headerInfo: {
        marginLeft: 12,
    },
    headerName: {
        fontSize: 17,
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
        letterSpacing: -0.3,
    },
    headerStatus: {
        fontSize: 12,
        fontFamily: Theme.fonts.medium,
        color: '#10B981',
        marginTop: -1,
    },
    bubbleWrapper: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: width * 0.78,
    },
    sendContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 56,
        marginRight: 6,
    },
    sendButton: {
        backgroundColor: Theme.colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    inputToolbar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    iconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F1F5F9', // Subtle gray background for the input
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.text,
        maxHeight: 120,
        marginHorizontal: 8,
    },
    typingIndicator: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    typingText: {
        fontSize: 13,
        fontFamily: Theme.fonts.medium,
        color: Theme.colors.textSecondary,
        fontStyle: 'italic',
    },
});
