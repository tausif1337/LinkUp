import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { signOut, User } from 'firebase/auth';
import { LogOut, User as UserIcon, Bell, Search, PlusCircle, LayoutGrid, Users, MessageSquare } from 'lucide-react-native';
import { auth } from '../config/firebase';
import { Theme } from '../theme/Theme';

type Props = {
  user: User;
  onNavigate: (screen: 'Login' | 'Register' | 'Feed' | 'Profile') => void;
};

export default function FeedScreen({ user, onNavigate }: Props) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.username}>{user.displayName || user.email?.split('@')[0]}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Search color={Theme.colors.textSecondary} size={22} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Bell color={Theme.colors.textSecondary} size={22} />
          </Pressable>
          <Pressable
            style={styles.profileAvatar}
            onPress={() => onNavigate('Profile')}
          >
            <UserIcon color={Theme.colors.primary} size={24} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeTitle}>Your Network</Text>
            <Text style={styles.welcomeSubtitle}>Stay connected with your peers.</Text>
            <Pressable style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>Explore Feed</Text>
            </Pressable>
          </View>
          <LayoutGrid color={Theme.colors.primary} size={60} opacity={0.1} style={styles.bgIcon} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <PlusCircle color={Theme.colors.primary} size={24} />
            </View>
            <Text style={styles.actionLabel}>New Post</Text>
          </Pressable>
          <Pressable style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Users color="#10B981" size={24} />
            </View>
            <Text style={styles.actionLabel}>Contacts</Text>
          </Pressable>
          <Pressable style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <MessageSquare color="#F43F5E" size={24} />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
          </Pressable>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>All systems operational</Text>
          </View>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Theme.colors.error} size="small" />
          ) : (
            <>
              <LogOut color={Theme.colors.error} size={20} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
  },
  greeting: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
  },
  username: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLight,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
  },
  welcomeCard: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Theme.spacing.xl,
  },
  welcomeInfo: {
    flex: 1,
    zIndex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: Theme.fonts.display,
    color: '#fff',
    marginBottom: Theme.spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Theme.spacing.lg,
  },
  exploreBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  exploreBtnText: {
    color: Theme.colors.primary,
    fontFamily: Theme.fonts.bold,
    fontSize: 14,
  },
  bgIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 0,
  },
  sectionHeader: {
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  actionItem: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text,
  },
  statusSection: {
    marginBottom: Theme.spacing.xl,
  },
  statusTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: Theme.spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: '#065F46',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  logoutText: {
    color: Theme.colors.error,
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
  },
});

