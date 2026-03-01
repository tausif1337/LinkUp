import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config/firebase';
import LoginScreen from './screens/LoginScreen.tsx';
import RegisterScreen from './screens/RegisterScreen.tsx';
import FeedScreen from './screens/FeedScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import MessagesScreen from './screens/MessagesScreen.tsx';
import ChatScreen from './screens/ChatScreen.tsx';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Theme } from './theme/Theme';

type Screen = 'Login' | 'Register' | 'Feed' | 'Profile' | 'Messages' | 'Chat';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Outfit_700Bold,
  });

  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const navigate = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Persist user session to AsyncStorage
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
        // Clear stored session when user logs out
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
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    if (user) {
      switch (currentScreen) {
        case 'Profile':
          return <ProfileScreen user={user} onNavigate={navigate} />;
        case 'Messages':
          return <MessagesScreen user={user} onNavigate={navigate} />;
        case 'Chat':
          return <ChatScreen user={user} recipient={screenParams?.recipient} onNavigate={navigate} />;
        default:
          return <FeedScreen user={user} onNavigate={navigate} />;
      }
    }

    if (currentScreen === 'Register') {
      return <RegisterScreen onNavigate={navigate} />;
    }

    return <LoginScreen onNavigate={navigate} />;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
