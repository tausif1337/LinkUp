import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    Pressable, Image, ActivityIndicator, TextInput,
    Dimensions, PixelRatio,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { MessageCircle, User as UserIcon, Search, Edit } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const normalize = (size: number) => Math.round(PixelRatio.roundToNearestPixel(size));

type Chat = {
    id: string;
    participants: string[];
    participantDetails: { [key: string]: { displayName: string; photoURL?: string } };
    lastMessage: string;
    lastUpdate: any;
};

type Props = { user: User; navigation: any };

export default function MessagesScreen({ user, navigation }: Props) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'chats'),
            where('users', 'array-contains', user.uid),
            orderBy('lastUpdate', 'desc')
        );
        return onSnapshot(q, snap => {
            setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Chat[]);
            setLoading(false);
        }, err => {
            console.error(err);
            setLoading(false);
        });
    }, [user.uid]);

    const filtered = chats.filter(chat => {
        const rid = chat.participants.find(uid => uid !== user.uid);
        const info = chat.participantDetails?.[rid || ''];
        return info?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
    });

    // Format relative timestamps
    const formatTime = (ts: any): string => {
        if (!ts?.toDate) return '';
        const d = ts.toDate() as Date;
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item, index }: { item: Chat; index: number }) => {
        const rid = item.participants.find(uid => uid !== user.uid);
        const info = item.participantDetails?.[rid || ''] || { displayName: 'User' };
        const initial = info.displayName?.[0]?.toUpperCase() || '?';
        const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B'];
        const avatarColor = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <Pressable
                    style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
                    onPress={() => navigation.navigate('Chat', {
                        recipient: { uid: rid, ...info }
                    })}
                >
                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        {info.photoURL ? (
                            <Image source={{ uri: info.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                                <Text style={styles.initials}>{initial}</Text>
                            </View>
                        )}
                        <View style={styles.onlineDot} />
                    </View>

                    {/* Text block */}
                    <View style={styles.chatMeta}>
                        <View style={styles.chatTop}>
                            <Text style={styles.chatName} numberOfLines={1}>{info.displayName}</Text>
                            <Text style={styles.chatTime}>{formatTime(item.lastUpdate)}</Text>
                        </View>
                        <View style={styles.chatBottom}>
                            <Text style={styles.chatPreview} numberOfLines={1}>
                                {item.lastMessage || 'No messages yet'}
                            </Text>
                            {/* Unread badge (static, can wire up later) */}
                            {/* <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View> */}
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={styles.screen}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Messages</Text>
                        {!loading && (
                            <Text style={styles.headerSub}>
                                {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
                            </Text>
                        )}
                    </View>
                    <Pressable style={styles.editBtn}>
                        <Edit size={20} color={Theme.colors.primary} />
                    </Pressable>
                </View>

                {/* ── Search ── */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Search size={18} color={Theme.colors.textMuted} />
                        <TextInput
                            placeholder="Search messages…"
                            placeholderTextColor={Theme.colors.textMuted}
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                    </View>
                </View>

                {/* ── Content ── */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Theme.colors.primary} />
                    </View>
                ) : filtered.length === 0 ? (
                    <Animated.View style={styles.centered} entering={FadeInUp.springify()}>
                        <View style={styles.emptyIcon}>
                            <MessageCircle size={36} color={Theme.colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {searchQuery ? 'No results found' : 'No messages yet'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {searchQuery ? 'Try a different name' : 'Start a conversation from the Feed'}
                        </Text>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={filtered}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = normalize(54);

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: normalize(28),
        fontFamily: Theme.fonts.display,
        color: Theme.colors.text,
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: normalize(13),
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textMuted,
        marginTop: 2,
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Search
    searchWrap: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: normalize(15),
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.text,
        padding: 0, // Android reset
    },

    // List
    list: {
        paddingBottom: 80, // room for tab bar
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#F1F5F9',
        marginLeft: 20 + AVATAR_SIZE + 14, // align with text
    },

    // Chat row
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    chatRowPressed: {
        backgroundColor: '#F8FAFC',
    },

    // Avatar
    avatarWrap: { position: 'relative' },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        fontSize: normalize(20),
        fontFamily: Theme.fonts.bold,
        color: '#fff',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2.5,
        borderColor: '#fff',
    },

    // Meta
    chatMeta: {
        flex: 1,
        marginLeft: 14,
        minWidth: 0, // allow text truncation
    },
    chatTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    chatName: {
        fontSize: normalize(16),
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
        flex: 1,
        marginRight: 8,
    },
    chatTime: {
        fontSize: normalize(12),
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textMuted,
        flexShrink: 0,
    },
    chatBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatPreview: {
        fontSize: normalize(14),
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textSecondary,
        flex: 1,
    },
    // Optional unread badge
    badge: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: normalize(12),
        fontFamily: Theme.fonts.bold,
        color: '#fff',
    },

    // Empty state
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: normalize(18),
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
        marginBottom: 6,
    },
    emptySub: {
        fontSize: normalize(14),
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
