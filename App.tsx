import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, MessageSquare, User as UserIcon } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
} from 'react-native-reanimated';

import { auth } from './config/firebase';
import { Theme } from './theme/Theme';

import LoginScreen from './screens/LoginScreen.tsx';
import RegisterScreen from './screens/RegisterScreen.tsx';
import FeedScreen from './screens/FeedScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import MessagesScreen from './screens/MessagesScreen.tsx';
import ChatScreen from './screens/ChatScreen.tsx';
import NotificationsScreen from './screens/NotificationsScreen.tsx';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import NotificationToast from './components/NotificationToast';
import FeedbackToast from './components/FeedbackToast';

import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_700Bold } from '@expo-google-fonts/outfit';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

type TabItem = {
  name: string;
  label: string;
  icon: (focused: boolean) => React.ReactNode;
};

const TAB_ITEMS: TabItem[] = [
  {
    name: 'Home',
    label: 'Home',
    icon: (focused) => (
      <Home
        size={22}
        color={focused ? Theme.colors.primary : '#94A3B8'}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  },
  {
    name: 'Messages',
    label: 'Messages',
    icon: (focused) => (
      <MessageSquare
        size={22}
        color={focused ? Theme.colors.primary : '#94A3B8'}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  },
  {
    name: 'Profile',
    label: 'Profile',
    icon: (focused) => (
      <UserIcon
        size={22}
        color={focused ? Theme.colors.primary : '#94A3B8'}
        strokeWidth={focused ? 2.5 : 1.8}
      />
    ),
  },
];

function TabBarButton({
  item,
  isFocused,
  onPress,
}: {
  item: TabItem;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pillWidth = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    pillWidth.value = withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 });
  }, [isFocused]);

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  };

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedPill = useAnimatedStyle(() => ({
    opacity: pillWidth.value,
    transform: [{ scaleX: pillWidth.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.tabItemInner, animatedScale]}>
        {/* Active pill indicator behind icon */}
        <Animated.View style={[styles.activePill, animatedPill]} />
        <View style={styles.iconWrap}>
          {item.icon(isFocused)}
        </View>
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      {TAB_ITEMS.map((item, index) => (
        <TabBarButton
          key={item.name}
          item={item}
          isFocused={state.index === index}
          onPress={() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index].key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(state.routes[index].name);
            }
          }}
        />
      ))}
    </View>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────

function TabNavigator({ user }: { user: User }) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home">
        {(props) => <FeedScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Messages">
        {(props) => <MessagesScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Outfit_700Bold,
  });

  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await AsyncStorage.setItem('userSession', JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          }));
        } catch (error) {
          console.error('Error saving user session:', error);
        }
      } else {
        try {
          await AsyncStorage.removeItem('userSession');
        } catch (error) {
          console.error('Error clearing user session:', error);
        }
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <View style={styles.appWrap}>
          <NavigationContainer>
            {user ? (
              <NotificationProvider user={user}>
                <View style={styles.appWrap}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="MainTabs">
                      {(props) => <TabNavigator {...props} user={user} />}
                    </Stack.Screen>
                    <Stack.Screen name="Chat">
                      {(props) => <ChatScreen {...props} user={user} />}
                    </Stack.Screen>
                    <Stack.Screen name="UserProfile">
                      {(props) => <ProfileScreen {...props} user={user} />}
                    </Stack.Screen>
                    <Stack.Screen name="Notifications">
                      {(props) => <NotificationsScreen {...props} user={user} />}
                    </Stack.Screen>
                  </Stack.Navigator>
                  <NotificationToast />
                </View>
              </NotificationProvider>
            ) : (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </Stack.Navigator>
            )}
          </NavigationContainer>
          <FeedbackToast />
        </View>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  appWrap: {
    flex: 1,
  },
  // Tab bar container
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },

  // Each tab column
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 20,
    minWidth: 56,
  },

  // Animated pill that appears behind the icon when active
  activePill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EEF2FF', // Light indigo
    borderRadius: 16,
  },

  iconWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    marginTop: 4,
  },
  tabLabelActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.fonts.bold,
  },

  // Loading screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
  },
});
