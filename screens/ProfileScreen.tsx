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
} from 'react-native';
import { User, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';

type Props = {
  user: User;
  onNavigate: (screen: 'Login' | 'Register' | 'Feed' | 'Profile') => void;
};

type UserProfile = {
  displayName: string;
  bio: string;
  photoURL: string;
  createdAt: string;
};

export default function ProfileScreen({ user, onNavigate }: Props) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
    
    // Create a timeout promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - network may be slow')), 10000)
    );
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Race between Firestore request and timeout
      const userDoc = await Promise.race([
        getDoc(userDocRef),
        timeoutPromise
      ]) as any;
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setProfile({
          displayName: data.displayName || user.displayName || '',
          bio: data.bio || '',
          photoURL: data.photoURL || user.photoURL || '',
          createdAt: data.createdAt || '',
        });
        setEditedProfile({
          displayName: data.displayName || user.displayName || '',
          bio: data.bio || '',
          photoURL: data.photoURL || user.photoURL || '',
          createdAt: data.createdAt || '',
        });
      } else {
        // Create initial profile document
        const initialProfile: UserProfile = {
          displayName: user.displayName || '',
          bio: '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialProfile);
        setProfile(initialProfile);
        setEditedProfile(initialProfile);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // Show error but allow user to continue with default profile
      const errorMessage = error?.message || '';
      const errorCode = error?.code || '';
      
      // Check for various offline error patterns
      const isOfflineError = 
        errorCode === 'unavailable' || 
        errorCode === 'failed-precondition' ||
        errorMessage.includes('offline') ||
        errorMessage.includes('client is offline') ||
        errorMessage.includes('network') ||
        errorCode.includes('network');
      
      const message = isOfflineError 
        ? 'Unable to connect to database. Your profile will be available when connection is restored.'
        : 'Failed to load profile data. Please try again later.';
      
      // Set default profile so loading screen disappears
      const defaultProfile: UserProfile = {
        displayName: user.displayName || '',
        bio: '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      };
      setProfile(defaultProfile);
      setEditedProfile(defaultProfile);
      
      Alert.alert('Notice', message);
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
      const userDocRef = doc(db, 'users', user.uid);
      const updatedProfile = {
        ...editedProfile,
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(userDocRef, updatedProfile, { merge: true });
      
      // Update Firebase Auth profile if display name changed
      if (editedProfile.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: editedProfile.displayName,
          photoURL: editedProfile.photoURL || null,
        });
      }
      
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
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

  const uploadImageToStorage = async (imageAsset: Asset): Promise<string | null> => {
    if (!user.uid || !imageAsset.uri) return null;

    try {
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profile_images/${user.uid}/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8 as const,
    };

    try {
      const result: ImagePickerResponse = useCamera 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) return;
      
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to select image');
        return;
      }

      if (result.assets && result.assets[0]) {
        const imageAsset = result.assets[0];
        
        setUploadingImage(true);
        try {
          const downloadURL = await uploadImageToStorage(imageAsset);
          if (downloadURL) {
            setEditedProfile(prev => ({ ...prev, photoURL: downloadURL }));
            if (!isEditing) {
              setIsEditing(true);
            }
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Profile Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => handleImagePicker(true) },
        { text: 'Gallery', onPress: () => handleImagePicker(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToFeed = () => {
    onNavigate('Feed');
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBackToFeed} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          style={[styles.logoutButton, saving ? styles.buttonDisabled : null]}
          onPress={handleLogout}
        >
          {saving ? (
            <ActivityIndicator color="#FF3B30" size="small" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <Pressable onPress={showImagePickerOptions} disabled={uploadingImage}>
            <View style={styles.photoContainer}>
              {uploadingImage ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : editedProfile.photoURL ? (
                <Image source={{ uri: editedProfile.photoURL }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.placeholderPhoto}>
                  <Text style={styles.placeholderText}>
                    {editedProfile.displayName ? editedProfile.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.editPhotoBadge}>
                <Text style={styles.editPhotoText}>📷</Text>
              </View>
            </View>
          </Pressable>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>User Information</Text>
            {!isEditing ? (
              <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={[styles.input, errors.displayName ? styles.inputError : null]}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  value={editedProfile.displayName}
                  onChangeText={(text) => {
                    setEditedProfile(prev => ({ ...prev, displayName: text }));
                    if (errors.displayName) setErrors({ ...errors, displayName: undefined });
                  }}
                  editable={!saving}
                />
                {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.textArea, errors.bio ? styles.inputError : null]}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#999"
                  value={editedProfile.bio}
                  onChangeText={(text) => {
                    setEditedProfile(prev => ({ ...prev, bio: text }));
                    if (errors.bio) setErrors({ ...errors, bio: undefined });
                  }}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={!saving}
                />
                <Text style={styles.characterCount}>{editedProfile.bio.length}/500</Text>
                {errors.bio ? <Text style={styles.errorText}>{errors.bio}</Text> : null}
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.cancelButton, saving ? styles.buttonDisabled : null]}
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, saving ? styles.buttonDisabled : null]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.infoDisplay}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>
                  {profile.displayName || 'Not set'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bio</Text>
                <Text style={styles.bioText}>
                  {profile.bio || 'No bio added yet. Tap Edit to add one.'}
                </Text>
              </View>
              {profile.createdAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.settingsList}>
            <Pressable style={styles.settingItem}>
              <Text style={styles.settingText}>Notifications</Text>
              <Text style={styles.settingArrow}>›</Text>
            </Pressable>
            <Pressable style={styles.settingItem}>
              <Text style={styles.settingText}>Privacy</Text>
              <Text style={styles.settingArrow}>›</Text>
            </Pressable>
            <Pressable style={styles.settingItem}>
              <Text style={styles.settingText}>Help & Support</Text>
              <Text style={styles.settingArrow}>›</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  uploadingOverlay: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f5f5f5',
  },
  editPhotoText: {
    fontSize: 16,
  },
  photoHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoDisplay: {
    gap: 16,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  bioText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  editForm: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsList: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  settingArrow: {
    fontSize: 20,
    color: '#999',
  },
});
