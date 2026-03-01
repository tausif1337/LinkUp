import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { ChevronLeft, MessageCircle, User as UserIcon, Search } from 'lucide-react-native';

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

    useEffect(() => {
        // Query chats where user is in the 'users' array
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

    const renderChatItem = ({ item }: { item: Chat }) => {
        // Find recipient in participants
        const recipientUid = item.participants.find(uid => uid !== user.uid);
        const recipientInfo = item.participantDetails[recipientUid || ''] || { displayName: 'User', photoURL: '' };

        return (
            <Pressable
                style={styles.chatCard}
                onPress={() => navigation.navigate('Chat', { recipient: { uid: recipientUid, ...recipientInfo } })}
            >
                <View style={styles.avatarContainer}>
                    {recipientInfo.photoURL ? (
                        <Image source={{ uri: recipientInfo.photoURL }} style={styles.avatar} />
                    ) : (
                        <UserIcon color={Theme.colors.primary} size={24} />
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.recipientName}>{recipientInfo.displayName}</Text>
                        <Text style={styles.lastUpdate}>
                            {item.lastUpdate?.toDate ? new Date(item.lastUpdate.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search color={Theme.colors.textMuted} size={20} />
                    <TextInput
                        placeholder="Search conversations..."
                        style={styles.searchInput}
                        placeholderTextColor={Theme.colors.textMuted}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator color={Theme.colors.primary} size="large" />
                </View>
            ) : chats.length === 0 ? (
                <View style={styles.centerContainer}>
                    <MessageCircle size={64} color={Theme.colors.textMuted} opacity={0.2} />
                    <Text style={styles.emptyText}>No messages yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={chats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </SafeAreaView>
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
    headerTitle: {
        fontSize: 24,
        fontFamily: Theme.fonts.display,
        color: Theme.colors.text,
    },
    searchContainer: {
        paddingHorizontal: Theme.spacing.lg,
        paddingBottom: Theme.spacing.md,
        backgroundColor: Theme.colors.surface,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        height: 48,
        gap: Theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: Theme.fonts.regular,
        fontSize: 16,
        color: Theme.colors.text,
    },
    listContainer: {
        paddingVertical: Theme.spacing.sm,
    },
    chatCard: {
        flexDirection: 'row',
        paddingHorizontal: Theme.spacing.lg,
        paddingVertical: Theme.spacing.lg,
        backgroundColor: Theme.colors.surface,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: 56,
        height: 56,
    },
    chatInfo: {
        flex: 1,
        marginLeft: Theme.spacing.md,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipientName: {
        fontSize: 16,
        fontFamily: Theme.fonts.bold,
        color: Theme.colors.text,
    },
    lastUpdate: {
        fontSize: 12,
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textMuted,
    },
    lastMessage: {
        fontSize: 14,
        fontFamily: Theme.fonts.regular,
        color: Theme.colors.textSecondary,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: Theme.spacing.md,
        fontSize: 16,
        fontFamily: Theme.fonts.medium,
        color: Theme.colors.textMuted,
    },
});
