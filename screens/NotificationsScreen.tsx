import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { ChevronLeft, MessageCircle, User as UserIcon, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNotification } from '../context/NotificationContext';
import { Theme } from '../theme/Theme';
import type { StoredNotification } from '../context/NotificationContext';

type Props = { user: User; navigation: any };

function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen({ user, navigation }: Props) {
  const { notificationsList, hideNotification, clearNotification, clearAllNotifications } = useNotification();
  const receivedOnly = notificationsList.filter((n) => n.variant === 'received');

  const onPressItem = (item: StoredNotification) => {
    if (item.variant === 'received') {
      hideNotification();
      navigation.navigate('Chat', {
        recipient: {
          uid: item.senderId,
          displayName: item.senderName,
          photoURL: item.senderAvatar ?? '',
        },
      });
    }
  };

  const renderItem = ({ item, index }: { item: StoredNotification; index: number }) => {
    const title = item.senderName;
    const preview = item.text.length > 50 ? item.text.slice(0, 50) + '…' : item.text;

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => onPressItem(item)}
        >
          <View style={styles.avatarWrap}>
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <UserIcon size={22} color={Theme.colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.body}>
            <View style={styles.rowTop}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
            </View>
            <View style={styles.rowBottom}>
              <MessageCircle size={14} color={Theme.colors.textMuted} style={styles.messageIcon} />
              <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
            onPress={() => clearNotification(item.id)}
            hitSlop={12}
          >
            <Trash2 size={18} color={Theme.colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={Theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {receivedOnly.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            onPress={clearAllNotifications}
          >
            <Text style={styles.clearBtnText}>Clear all</Text>
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <FlatList
        data={receivedOnly}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={receivedOnly.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <MessageCircle size={48} color={Theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you get new messages or send one, they’ll show up here.
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
  headerTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.primary,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyInner: {
    alignItems: 'center',
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  rowPressed: {
    opacity: 0.9,
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textMuted,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIcon: {
    marginRight: 6,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
});
