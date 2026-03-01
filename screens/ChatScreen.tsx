import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Send, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { User } from 'firebase/auth';
import {
    collection, addDoc, query, orderBy,
    onSnapshot, serverTimestamp, doc, setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { ChevronLeft, Send as SendIcon, Video, User as UserIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeInRight, FadeInLeft,
    useAnimatedStyle, withSpring, useSharedValue
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Sub-components (must be outside parent to satisfy Rules of Hooks) ────────

const AnimatedSendButton = memo(({ sendButtonScale, ...props }: any) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sendButtonScale.value }],
    }));
    return (
        <Send
            {...props}
            isSendButtonAlwaysVisible
            containerStyle={styles.sendContainer}
        >
            <Animated.View style={[styles.sendButton, animatedStyle]}>
                <SendIcon size={18} color="#fff" fill="#fff" />
            </Animated.View>
        </Send>
    );
});

const MessageBubble = memo(({ userUid, ...props }: any) => {
    const isSelf = props.currentMessage.user._id === userUid;
    return (
        <Animated.View
            entering={isSelf ? FadeInRight.duration(300) : FadeInLeft.duration(300)}
        >
            {isSelf ? (
                <LinearGradient
                    colors={['#5B4FF5', '#7C6BFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bubbleSelf}
                >
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: 'transparent', margin: 0 },
                            left: { backgroundColor: 'transparent', margin: 0 },
                        }}
                        textStyle={{
                            right: { color: '#fff', fontFamily: Theme.fonts.regular, fontSize: 15, lineHeight: 21 },
                            left: { color: '#0F172A', fontFamily: Theme.fonts.regular, fontSize: 15, lineHeight: 21 },
                        }}
                        timeTextStyle={{
                            right: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
                            left: { color: '#94A3B8', fontSize: 11 },
                        }}
                    />
                </LinearGradient>
            ) : (
                <View style={styles.bubbleOther}>
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: 'transparent', margin: 0 },
                            left: { backgroundColor: 'transparent', margin: 0 },
                        }}
                        textStyle={{
                            right: { color: '#fff', fontFamily: Theme.fonts.regular, fontSize: 15, lineHeight: 21 },
                            left: { color: '#0F172A', fontFamily: Theme.fonts.regular, fontSize: 15, lineHeight: 21 },
                        }}
                        timeTextStyle={{
                            right: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
                            left: { color: '#94A3B8', fontSize: 11 },
                        }}
                    />
                </View>
            )}
        </Animated.View>
    );
});

const ChatInputToolbar = memo((props: any) => (
    <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
    />
));

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Props = { user: User; route: any; navigation: any };

export default function ChatScreen({ user, route, navigation }: Props) {
    const { recipient } = route.params;
    const [messages, setMessages] = useState<IMessage[]>([]);
    const insets = useSafeAreaInsets();
    const sendScale = useSharedValue(1);

    const chatId = [user.uid, recipient.uid].sort().join('_');

    // Dynamic header height (safe-area + inner content)
    const HEADER_HEIGHT = insets.top + 64;

    useEffect(() => {
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => {
                const data = d.data();
                return {
                    _id: d.id,
                    text: data.text,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    user: data.user,
                } as IMessage;
            }));
        });
    }, [chatId]);

    const onSend = useCallback(async (newMessages: IMessage[] = []) => {
        const { _id, text, user: msgUser } = newMessages[0];
        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                _id, text, createdAt: serverTimestamp(), user: msgUser,
            });
            await setDoc(doc(db, 'chats', chatId), {
                participants: [user.uid, recipient.uid],
                participantDetails: {
                    [user.uid]: { displayName: user.displayName || 'User', photoURL: user.photoURL || '' },
                    [recipient.uid]: { displayName: recipient.displayName, photoURL: recipient.photoURL || '' },
                },
                lastMessage: text,
                lastUpdate: serverTimestamp(),
                users: [user.uid, recipient.uid],
            }, { merge: true });
        } catch (e) { console.error(e); }
    }, [chatId, user, recipient]);

    return (
        <View style={styles.screen}>
            {/* Chat list — paddingTop pushes messages below the floating header */}
            <GiftedChat
                messages={messages}
                onSend={msgs => onSend(msgs)}
                user={{ _id: user.uid, name: user.displayName || 'You', avatar: user.photoURL || '' }}
                renderSend={props => <AnimatedSendButton {...props} sendButtonScale={sendScale} />}
                renderBubble={props => <MessageBubble {...props} userUid={user.uid} />}
                renderInputToolbar={props => <ChatInputToolbar {...props} />}
                renderAvatar={null}
                isSendButtonAlwaysVisible
                messagesContainerStyle={{ paddingTop: HEADER_HEIGHT }}
                minInputToolbarHeight={64 + insets.bottom}
                maxComposerHeight={120}
                textInputProps={{
                    placeholder: 'Message...',
                    placeholderTextColor: '#94A3B8',
                    style: styles.textInput,
                    onFocus: () => { sendScale.value = withSpring(1.15); },
                    onBlur: () => { sendScale.value = withSpring(1); },
                }}
            />

            {/* ── Floating Header (rendered last so it sits on top) ── */}
            <View style={[styles.header, { paddingTop: insets.top }]} pointerEvents="box-none">
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.headerRow}>
                    {/* Back */}
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
                    >
                        <ChevronLeft size={24} color={Theme.colors.text} />
                    </Pressable>

                    {/* Avatar + name */}
                    <Pressable style={styles.headerCenter}>
                        <View style={styles.avatarWrap}>
                            {recipient.photoURL
                                ? <Image source={{ uri: recipient.photoURL }} style={styles.avatar} />
                                : (
                                    <View style={styles.avatarFallback}>
                                        <UserIcon size={18} color={Theme.colors.primary} />
                                    </View>
                                )
                            }
                            <View style={styles.onlineDot} />
                        </View>
                        <View style={styles.headerMeta}>
                            <Text style={styles.headerName} numberOfLines={1}>{recipient.displayName}</Text>
                            <Text style={styles.headerSub}>Online</Text>
                        </View>
                    </Pressable>

                    {/* Action */}
                    <Pressable style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}>
                        <Video size={22} color={Theme.colors.textSecondary} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    // ─ Header ─
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        overflow: 'hidden',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.07)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressed: { opacity: 0.5 },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerMeta: { marginLeft: 10, flex: 1 },
    headerName: {
        fontSize: 16,
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
        letterSpacing: -0.2,
    },
    headerSub: {
        fontSize: 12,
        fontFamily: Theme.fonts.medium,
        color: '#10B981',
    },

    // ─ Bubbles ─
    bubbleSelf: {
        maxWidth: SCREEN_WIDTH * 0.76,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 5,
        marginBottom: 4,
    },
    bubbleOther: {
        maxWidth: SCREEN_WIDTH * 0.76,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 22,
        marginBottom: 4,
        // subtle lift
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },

    // ─ Input Toolbar ─
    inputToolbar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8,
    },
    inputPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        fontFamily: Theme.fonts.regular,
        color: '#0F172A',
        maxHeight: 120,
        // No margin needed — the toolbar padding handles spacing
    },

    // ─ Send ─
    sendContainer: {
        width: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
});
