import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config/firebase';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FeedScreen from './screens/FeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Theme } from './theme/Theme';

type Screen = 'Login' | 'Register' | 'Feed' | 'Profile';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Outfit_700Bold,
  });

  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

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
      if (currentScreen === 'Profile') {
        return <ProfileScreen user={user} onNavigate={setCurrentScreen} />;
      }
      return <FeedScreen user={user} onNavigate={setCurrentScreen} />;
    }

    if (currentScreen === 'Register') {
      return <RegisterScreen onNavigate={setCurrentScreen} />;
    }

    return <LoginScreen onNavigate={setCurrentScreen} />;
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
