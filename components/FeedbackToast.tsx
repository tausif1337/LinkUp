import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useToast } from '../context/ToastContext';
import { Theme } from '../theme/Theme';
import { CheckCircle, XCircle, Info } from 'lucide-react-native';

export default function FeedbackToast() {
  const insets = useSafeAreaInsets();
  const toast = useToast()?.toast ?? null;

  if (!toast) return null;

  const isSuccess = toast.variant === 'success';
  const isError = toast.variant === 'error';
  const Icon = isSuccess ? CheckCircle : isError ? XCircle : Info;
  const bgColor = isSuccess ? '#10B981' : isError ? Theme.colors.error : Theme.colors.primary;

  return (
    <Animated.View
      entering={FadeInUp.duration(280).springify()}
      exiting={FadeOutDown.duration(220)}
      style={[styles.container, { bottom: insets.bottom + 24 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.toast, { backgroundColor: bgColor }]}>
        <Icon size={20} color="#fff" strokeWidth={2.5} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9998,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: '100%',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: '#fff',
    lineHeight: 20,
  },
});
