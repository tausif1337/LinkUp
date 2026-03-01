import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react-native';
import { auth } from '../config/firebase';
import { Theme } from '../theme/Theme';

type Props = {
  onNavigate: (screen: any, params?: any) => void;
};

export default function LoginScreen({ onNavigate }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LogIn color={Theme.colors.primary} size={40} />
            </View>
            <Text style={styles.logoText}>LinkUp</Text>
            <Text style={styles.tagline}>Connect, share, and grow with your network.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your details to sign in</Text>

            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Mail color={errors.email ? Theme.colors.error : Theme.colors.textMuted} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Lock color={errors.password ? Theme.colors.error : Theme.colors.textMuted} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (loading || pressed) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <ArrowRight color="#fff" size={20} style={styles.buttonIcon} />
                </>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to LinkUp?</Text>
              <Pressable onPress={() => onNavigate('Register')}>
                <Text style={styles.linkText}>Create an Account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: Theme.spacing.md,
  },
  logoText: {
    fontSize: 32,
    fontFamily: Theme.fonts.display,
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  form: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  inputWrapper: {
    marginBottom: Theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
  },
  inputError: {
    borderColor: Theme.colors.error,
    backgroundColor: '#FFF1F2',
  },
  errorText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
    marginLeft: 4,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primary,
    height: 56,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
  },
  buttonIcon: {
    marginLeft: Theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
  },
  footerText: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    marginRight: 4,
  },
  linkText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.primary,
  },
});

