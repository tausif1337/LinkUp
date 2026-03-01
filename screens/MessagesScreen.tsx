import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { MessageCircle, User as UserIcon, Search, MoreHorizontal } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type Chat = {
    id: string;
    participants: string[];
    participantDetails: {
        [key: string]: {
            displayName: string;
            photoURL?: string;
        };
    };
    lastMessage: string;
    lastUpdate: any;
};

type Props = {
    user: User;
    navigation: any;
};

export default function MessagesScreen({ user, navigation }: Props) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('users', 'array-contains', user.uid),
            orderBy('lastUpdate', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];
            setChats(chatsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, [user.uid]);

    const filteredChats = chats.filter(chat => {
        const recipientUid = chat.participants.find(uid => uid !== user.uid);
        const recipientInfo = chat.participantDetails[recipientUid || ''] || { displayName: 'User' };
        return recipientInfo.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const renderChatItem = ({ item, index }: { item: Chat, index: number }) => {
        const recipientUid = item.participants.find(uid => uid !== user.uid);
        const recipientInfo = item.participantDetails[recipientUid || ''] || { displayName: 'User', photoURL: '' };

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
                <Pressable
                    style={({ pressed }) => [
                        styles.chatCard,
                        pressed && styles.chatCardPressed
                    ]}
                    onPress={() => navigation.navigate('Chat', { recipient: { uid: recipientUid, ...recipientInfo } })}
                >
                    <View style={styles.avatarContainer}>
                        {recipientInfo.photoURL ? (
                            <Image source={{ uri: recipientInfo.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <UserIcon color={Theme.colors.primary} size={24} />
                            </View>
                        )}
                        <View style={styles.onlineIndicator} />
                    </View>
                    <View style={styles.chatInfo}>
                        <View style={styles.chatHeader}>
                            <Text style={styles.recipientName} numberOfLines={1}>{recipientInfo.displayName}</Text>
                            <Text style={styles.lastUpdate}>
                                {item.lastUpdate?.toDate ? new Date(item.lastUpdate.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Text>
                        </View>
                        <View style={styles.lastMessageContainer}>
                            <Text style={styles.lastMessage} numberOfLines={1}>
                                {item.lastMessage}
                            </Text>
                            <View style={styles.unreadDot} />
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Mesh Background Effect */}
            <View style={styles.meshBg} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Messages</Text>
                        <Text style={styles.headerSubtitle}>{chats.length} active conversations</Text>
                    </View>
                    <Pressable style={styles.headerIcon}>
                        <MoreHorizontal size={24} color={Theme.colors.text} />
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <BlurView intensity={20} tint="light" style={styles.searchBar}>
                        <Search color={Theme.colors.textSecondary} size={20} />
                        <TextInput
                            placeholder="Search messages..."
                            style={styles.searchInput}
                            placeholderTextColor={Theme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator color={Theme.colors.primary} size="large" />
                    </View>
                ) : filteredChats.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Animated.View entering={FadeInUp.springify()}>
                            <MessageCircle size={80} color={Theme.colors.primary} opacity={0.15} />
                            <Text style={styles.emptyText}>No messages found</Text>
                        </Animated.View>
                    </View>
                ) : (
                    <FlatList
                        data={filteredChats}
                        renderItem={renderChatItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    meshBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
        backgroundColor: '#EEF2FF', // Very light indigo
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: Theme.fonts.display,
        color: Theme.colors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.medium,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(241, 245, 249, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        gap: 12,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        fontFamily: Theme.fonts.regular,
        fontSize: 16,
        color: Theme.colors.text,
    },
    listContainer: {
        paddingBottom: 40,
    },
    chatCard: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignItems: 'center',
    },
    chatCardPressed: {
        backgroundColor: '#F8FAFC',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        borderColor: '#fff',
    },
    placeholderAvatar: {
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: '#fff',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 16,
        height: 64,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipientName: {
        fontSize: 18,
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
        flex: 1,
    },
    lastUpdate: {
        fontSize: 13,
        fontFamily: Theme.fonts.medium,
        color: Theme.colors.textMuted,
        marginLeft: 8,
    },
    lastMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 15,
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textSecondary,
        flex: 1,
        paddingRight: 10,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Theme.colors.primary,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: Theme.fonts.medium,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
    },
});
