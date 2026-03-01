import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Camera, Edit2, Shield, Bell, HelpCircle, ChevronRight, ArrowLeft, LogOut, Check, X, MessageCircle, User as UserIcon } from 'lucide-react-native';
import { auth, db } from '../config/firebase';

import { Theme } from '../theme/Theme';
import { pickImage, uploadToCloudinary } from '../utils/imageUtils';



type Props = {
  user: User;
  navigation: any;
  route?: any;
};

type UserProfile = {
  displayName: string;
  bio: string;
  photoURL: string;
  createdAt: string;
};

export default function ProfileScreen({ user, navigation, route }: Props) {
  const otherUserId = route?.params?.userId;
  const isOtherUser = otherUserId && otherUserId !== user.uid;
  const targetUid = isOtherUser ? otherUserId : user.uid;

  const [isInitializing, setIsInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    displayName: user.displayName || '',
    bio: '',
    photoURL: user.photoURL || '',
    createdAt: '',
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    displayName: user.displayName || '',
    bio: '',
    photoURL: user.photoURL || '',
    createdAt: '',
  });

  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!user.uid) {
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    try {
      const userDocRef = doc(db, 'users', targetUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        const profileData = {
          displayName: data.displayName || user.displayName || '',
          bio: data.bio || '',
          photoURL: data.photoURL || user.photoURL || '',
          createdAt: data.createdAt || '',
        };
        setProfile(profileData);
        setEditedProfile(profileData);
      } else if (!isOtherUser) {
        // Only create doc for current user if it doesn't exist
        const initialProfile: UserProfile = {
          displayName: user.displayName || '',
          bio: '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(userDocRef, initialProfile);
        } catch (e) {
          console.warn('Could not create initial profile doc:', e);
        }
        setProfile(initialProfile);
        setEditedProfile(initialProfile);
      } else {
        // Other user doc doesn't exists
        setProfile({
          displayName: 'User Not Found',
          bio: '',
          photoURL: '',
          createdAt: '',
        });
      }
    } catch (error: any) {
      console.warn('Notice loading profile:', error);
      Alert.alert('Database Notice', 'Failed to load profile data.');
    } finally {
      setIsInitializing(false);
    }
  };

  const validateForm = () => {
    const newErrors: { displayName?: string; bio?: string } = {};
    if (editedProfile.displayName.trim().length > 0 && editedProfile.displayName.trim().length < 2) {
      newErrors.displayName = 'Name must be at least 2 characters';
    }
    if (editedProfile.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user.uid) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      let finalPhotoURL = editedProfile.photoURL;

      // Check if the photoURL is a local URI (indicating a new image was picked)
      if (editedProfile.photoURL && (editedProfile.photoURL.startsWith('file://') || editedProfile.photoURL.startsWith('content://') || editedProfile.photoURL.startsWith('data:'))) {
        try {
          finalPhotoURL = await uploadToCloudinary(editedProfile.photoURL);
        } catch (uploadError: any) {
          Alert.alert('Upload Error', 'Failed to upload profile image to Cloudinary.');
          setSaving(false);
          return;
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const updatedProfile = {
        ...editedProfile,
        photoURL: finalPhotoURL,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, updatedProfile, { merge: true });

      // Update Firebase Auth user profile
      if (editedProfile.displayName !== user.displayName || finalPhotoURL !== user.photoURL) {
        await updateProfile(user, {
          displayName: editedProfile.displayName,
          photoURL: finalPhotoURL || null,
        });
      }

      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setErrors({});
    setIsEditing(false);
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    const asset = await pickImage(useCamera);
    if (!asset) return;

    setEditedProfile(prev => ({ ...prev, photoURL: asset.uri }));
    if (!isEditing) setIsEditing(true);
  };

  const showImagePickerOptions = () => {
    Alert.alert('Select Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => handleImagePicker(true) },
      { text: 'Choose from Gallery', onPress: () => handleImagePicker(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLogout = async () => {
    if (saving) return;
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={Theme.colors.text} size={24} />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{isOtherUser ? 'Profile' : 'Profile Settings'}</Text>
          {!isOtherUser && (
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <LogOut color={Theme.colors.error} size={20} />
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHero}>
            <Pressable onPress={showImagePickerOptions}>
              <View style={styles.photoWrapper}>
                {editedProfile.photoURL ? (
                  <Image source={{ uri: editedProfile.photoURL }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <UserIcon color="#fff" size={40} />
                  </View>
                )}
                <View style={styles.photoBadge}>
                  <Camera color="#fff" size={16} />
                </View>
              </View>
            </Pressable>

            <Text style={styles.profileName}>{profile.displayName || 'Unnamed User'}</Text>
            {!isOtherUser && <Text style={styles.profileEmail}>{user.email}</Text>}

            {isOtherUser ? (
              <Pressable
                style={styles.messageUserBtn}
                onPress={() => navigation.navigate('Chat', {
                  recipient: {
                    uid: targetUid,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL
                  }
                })}
              >
                <MessageCircle color="#fff" size={20} />
                <Text style={styles.messageUserBtnText}>Message</Text>
              </Pressable>
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>124</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2024'}
                  </Text>
                  <Text style={styles.statLabel}>Joined</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About</Text>
            {!isEditing && !isOtherUser && (
              <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn}>
                <Edit2 color={Theme.colors.primary} size={16} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.card}>
            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Display Name</Text>
                  <TextInput
                    style={[styles.input, errors.displayName && styles.inputError]}
                    value={editedProfile.displayName}
                    onChangeText={(t) => setEditedProfile(p => ({ ...p, displayName: t }))}
                    placeholder="Your name"
                  />
                  {errors.displayName && <Text style={styles.errorHint}>{errors.displayName}</Text>}
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <TextInput
                    style={[styles.textArea, errors.bio && styles.inputError]}
                    value={editedProfile.bio}
                    onChangeText={(t) => setEditedProfile(p => ({ ...p, bio: t }))}
                    placeholder="Tell us about yourself"
                    multiline
                    numberOfLines={4}
                  />
                  {errors.bio && <Text style={styles.errorHint}>{errors.bio}</Text>}
                </View>

                <View style={styles.actionGrid}>
                  <Pressable onPress={handleCancelEdit} style={styles.cancelBtn}>
                    <X color={Theme.colors.textSecondary} size={20} />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSaveProfile} style={styles.saveBtn} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Check color="#fff" size={20} />
                        <Text style={styles.saveBtnText}>Save</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.displaySection}>
                <View style={styles.displayItem}>
                  <Text style={styles.displayLabel}>About You</Text>
                  <Text style={styles.displayText}>
                    {profile.bio || "Write something about yourself to complete your profile."}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {!isOtherUser && (
            <>
              <Text style={[styles.sectionTitle, { marginLeft: Theme.spacing.md, marginBottom: Theme.spacing.sm }]}>Preferences</Text>
              <View style={styles.listCard}>
                <Pressable style={styles.listItem}>
                  <View style={[styles.listIconBg, { backgroundColor: '#EEF2FF' }]}>
                    <Bell color={Theme.colors.primary} size={20} />
                  </View>
                  <Text style={styles.listText}>Notifications</Text>
                  <ChevronRight color={Theme.colors.textMuted} size={20} />
                </Pressable>
                <Pressable style={styles.listItem}>
                  <View style={[styles.listIconBg, { backgroundColor: '#ECFDF5' }]}>
                    <Shield color="#10B981" size={20} />
                  </View>
                  <Text style={styles.listText}>Privacy & Security</Text>
                  <ChevronRight color={Theme.colors.textMuted} size={20} />
                </Pressable>
                <Pressable style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <View style={[styles.listIconBg, { backgroundColor: '#FFF7ED' }]}>
                    <HelpCircle color="#F59E0B" size={20} />
                  </View>
                  <Text style={styles.listText}>Help Center</Text>
                  <ChevronRight color={Theme.colors.textMuted} size={20} />
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 16,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: Theme.spacing.md,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },

  photoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontFamily: Theme.fonts.display,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  messageUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.full,
    gap: 8,
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageUserBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    marginBottom: Theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Theme.colors.border,
  },
  statValue: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.primary,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  editForm: {
    gap: Theme.spacing.md,
  },
  field: {
    gap: Theme.spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.textSecondary,
  },
  input: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    fontSize: 15,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
  },
  textArea: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    fontSize: 15,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
    height: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.error,
    marginTop: 2,
  },
  displaySection: {
    minHeight: 40,
  },
  displayItem: {
    marginBottom: Theme.spacing.md,
  },
  displayLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.xs,
  },
  displayText: {
    fontSize: 15,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    gap: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primary,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
  },
  listCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  listIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.text,
  },
});

