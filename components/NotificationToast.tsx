import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNotification } from '../context/NotificationContext';
import { Theme } from '../theme/Theme';
import { MessageCircle, User as UserIcon } from 'lucide-react-native';

export default function NotificationToast() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { notification, hideNotification } = useNotification();

  const onPress = () => {
    if (!notification) return;
    hideNotification();
    if (notification.variant === 'received') {
      navigation.navigate('Chat', {
        recipient: {
          uid: notification.senderId,
          displayName: notification.senderName,
          photoURL: notification.senderAvatar ?? '',
        },
      });
    }
  };

  if (!notification) return null;

  const preview = notification.text.length > 56 ? notification.text.slice(0, 56) + '…' : notification.text;
  const isSent = notification.variant === 'sent';
  const title = isSent ? `Sent to ${notification.senderName}` : notification.senderName;

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify()}
      exiting={FadeOutUp.duration(220)}
      style={[styles.toast, { top: insets.top + 10 }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        onPress={onPress}
      >
        <View style={styles.iconWrap}>
          {notification.senderAvatar ? (
            <Image source={{ uri: notification.senderAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <UserIcon size={20} color={Theme.colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.senderName} numberOfLines={1}>{title}</Text>
          <View style={styles.previewRow}>
            <MessageCircle size={12} color={Theme.colors.textMuted} style={styles.messageIcon} />
            <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    zIndex: 9999,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  senderName: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
});
