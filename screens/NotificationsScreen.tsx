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
  const { notificationsList, hideNotification, clearNotification, clearAllNotifications, markAsRead } = useNotification();
  const receivedOnly = notificationsList.filter((n) => n.variant === 'received');

  const onPressItem = (item: StoredNotification) => {
    if (item.variant === 'received') {
      markAsRead(item.id);
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
    const isUnread = !item.read;

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <Pressable
          style={({ pressed }) => [
            styles.row,
            isUnread ? styles.rowUnread : styles.rowRead,
            pressed && styles.rowPressed,
          ]}
          onPress={() => onPressItem(item)}
        >
          <View style={styles.avatarWrap}>
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, isUnread && styles.avatarFallbackUnread]}>
                <UserIcon size={22} color={Theme.colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.body}>
            <View style={styles.rowTop}>
              <Text style={[styles.title, isUnread ? styles.titleUnread : styles.titleRead]} numberOfLines={1}>{title}</Text>
              <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
            </View>
            <View style={styles.rowBottom}>
              <MessageCircle size={14} color={isUnread ? Theme.colors.primary : Theme.colors.textMuted} style={styles.messageIcon} />
              <Text style={[styles.preview, isUnread ? styles.previewUnread : styles.previewRead]} numberOfLines={1}>{preview}</Text>
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
            <MessageCircle size={40} color={Theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you get new messages, they’ll show here. Tap to open.
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
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
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
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  clearBtn: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 8,
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.primary,
  },
  listContent: {
    paddingVertical: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyInner: {
    alignItems: 'center',
  },
  emptyIcon: {
    opacity: 0.4,
    marginBottom: Theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
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
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    marginVertical: 3,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
  },
  rowUnread: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
    borderColor: '#E0E7FF',
  },
  rowRead: {
    backgroundColor: Theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderColor: Theme.colors.border,
  },
  rowPressed: {
    opacity: 0.88,
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackUnread: {
    backgroundColor: '#E0E7FF',
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
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    marginRight: 8,
  },
  titleUnread: {
    color: Theme.colors.text,
  },
  titleRead: {
    color: Theme.colors.textSecondary,
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
  },
  previewUnread: {
    color: Theme.colors.text,
  },
  previewRead: {
    color: Theme.colors.textMuted,
  },
  deleteBtn: {
    padding: Theme.spacing.sm,
    marginLeft: 4,
  },
});
