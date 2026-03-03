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

  const preview = notification.text.length > 60
    ? notification.text.slice(0, 60) + '…'
    : notification.text;
  const isSent = notification.variant === 'sent';
  const title = isSent ? `Sent to ${notification.senderName}` : notification.senderName;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(250)}
      style={[styles.toast, { top: insets.top + 8 }]}
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
          <View style={styles.row}>
            <MessageCircle size={14} color={Theme.colors.primary} style={styles.messageIcon} />
            <Text style={styles.senderName} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageIcon: {
    marginRight: 6,
  },
  senderName: {
    flex: 1,
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  preview: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
});
