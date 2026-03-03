import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'firebase/auth';
import { User as UserIcon, Bell, Search, LayoutGrid, MessageSquare, Image as ImageIcon, Heart, Share2, MoreVertical, X } from 'lucide-react-native';
import { db } from '../config/firebase';
import { useToast } from '../context/ToastContext';
import { useNotification } from '../context/NotificationContext';
import { Theme } from '../theme/Theme';
import { pickImage, uploadToCloudinary } from '../utils/imageUtils';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

type Props = {
  user: User;
  navigation: any;
};

type Post = {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  caption: string;
  imageUrl?: string;
  createdAt: any;
};

export default function FeedScreen({ user, navigation }: Props) {
  const showToast = useToast()?.showToast;
  const { notificationsList } = useNotification();
  const notificationCount = notificationsList.filter((n) => n.variant === 'received').length;
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  const setupPostsListener = () => {
    // Clean up existing listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        console.log('Posts snapshot received. Document count:', snapshot.docs.length);
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(postsData);
        setIsInitialLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setIsInitialLoading(false);
        setRefreshing(false);
        showToast?.('Failed to load posts. Please check your connection.', 'error');
      }
    );

    unsubscribeRef.current = unsubscribe;
  };

  // Real-time listener for posts
  useEffect(() => {
    setupPostsListener();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setupPostsListener();
  };


  const handleImagePick = async (useCamera: boolean) => {
    const asset = await pickImage(useCamera);
    if (asset) {
      setSelectedImage(asset.uri);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert('Select Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => handleImagePick(true) },
      { text: 'Choose from Gallery', onPress: () => handleImagePick(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmitPost = async () => {
    if (!caption.trim() && !selectedImage) {
      Alert.alert('Wait', 'Please add a caption or an image.');
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl = '';
      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage);
      }

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        caption: caption.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });

      setCaption('');
      setSelectedImage(null);
      setIsModalVisible(false);
      showToast?.('Post created successfully!', 'success');
    } catch (error) {
      console.error('Create post error:', error);
      showToast?.('Failed to create post. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Pressable
          style={styles.postUserInfo}
          onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
        >
          <View style={styles.postAvatar}>
            {item.userPhoto ? (
              <Image source={{ uri: item.userPhoto }} style={styles.avatarImage} />
            ) : (
              <UserIcon color={Theme.colors.primary} size={20} />
            )}
          </View>
          <View>
            <Text style={styles.postUserName}>{item.userName}</Text>
            <Text style={styles.postTime}>
              {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}
            </Text>
          </View>
        </Pressable>
        <Pressable>
          <MoreVertical color={Theme.colors.textMuted} size={20} />
        </Pressable>
      </View>

      {item.caption ? <Text style={styles.postCaption}>{item.caption}</Text> : null}

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      )}

      <View style={styles.postActions}>
        <Pressable style={styles.postAction}>
          <Heart color={Theme.colors.textSecondary} size={22} />
        </Pressable>
        <Pressable
          style={styles.postAction}
          onPress={() => { /* Handle Comment */ }}
        >
          <MessageSquare color={Theme.colors.textSecondary} size={22} />
        </Pressable>
        <Pressable
          style={styles.postAction}
          onPress={() => { /* Handle Share */ }}
        >
          <Share2 color={Theme.colors.textSecondary} size={22} />
        </Pressable>
      </View>
    </View>
  );

  const FeedHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.username}>{user.displayName || user.email?.split('@')[0]}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
            <Search color={Theme.colors.textSecondary} size={22} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.bellWrap}>
              <Bell color={Theme.colors.textSecondary} size={22} />
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.profileAvatar, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Profile')}
          >
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.headerAvatarImage} />
            ) : (
              <UserIcon color={Theme.colors.primary} size={24} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.innerContent}>
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeTitle}>Share your world</Text>
            <Text style={styles.welcomeSubtitle}>How are you feeling today?</Text>
            <Pressable
              style={({ pressed }) => [styles.exploreBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.exploreBtnText}>Create Post</Text>
            </Pressable>
          </View>
          <View style={styles.welcomeBgBlob} />
          <LayoutGrid color="#fff" size={80} opacity={0.15} style={styles.bgIcon} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
          <Pressable>
            <Text style={styles.seeAllLink}>See everything</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={FeedHeader}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isInitialLoading ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} />
            ) : (
              <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
            )}
          </View>
        }
      />

      {/* New Post Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Post</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <X color={Theme.colors.text} size={24} />
              </Pressable>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Theme.colors.textMuted}
              multiline
              value={caption}
              onChangeText={setCaption}
            />

            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <X color="#fff" size={16} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.addImageBtn} onPress={showImagePickerOptions}>
                <ImageIcon color={Theme.colors.primary} size={32} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.submitBtn,
                (!caption.trim() && !selectedImage) || isUploading ? styles.submitBtnDisabled : null
              ]}
              onPress={handleSubmitPost}
              disabled={(!caption.trim() && !selectedImage) || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Post Now</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
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
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: Theme.spacing.xl,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  innerContent: {
    paddingHorizontal: Theme.spacing.lg,
  },
  welcomeCard: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.xxl,
    padding: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    elevation: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  welcomeBgBlob: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 0,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  seeAllLink: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.primary,
  },
  headerContainer: {
    backgroundColor: Theme.colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  postCard: {
    backgroundColor: Theme.colors.surface,
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginHorizontal: Theme.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  postUserName: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  postTime: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.textMuted,
  },
  postCaption: {
    paddingHorizontal: Theme.spacing.lg,
    fontSize: 15,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.sm,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1, // Square posts look better across all devices
    backgroundColor: '#F1F5F9',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  postAction: {
    padding: Theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  captionInput: {
    fontSize: 16,
    fontFamily: Theme.fonts.regular,
    color: Theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Theme.spacing.md,
  },
  addImageBtn: {
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  addImageText: {
    marginTop: Theme.spacing.sm,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.textSecondary,
  },
  selectedImageContainer: {
    height: 200,
    marginBottom: Theme.spacing.lg,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.lg,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: Theme.colors.textMuted,
  },

  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

