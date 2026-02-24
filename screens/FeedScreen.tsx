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
import { User } from 'firebase/auth';
import { User as UserIcon, Bell, Search, LayoutGrid, MessageSquare, Image as ImageIcon, Heart, Share2, MoreVertical, X } from 'lucide-react-native';
import { db } from '../config/firebase';
import { Theme } from '../theme/Theme';
import { pickImage, uploadToCloudinary } from '../utils/imageUtils';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

type Props = {
  user: User;
  onNavigate: (screen: 'Login' | 'Register' | 'Feed' | 'Profile') => void;
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

export default function FeedScreen({ user, onNavigate }: Props) {
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
        Alert.alert('Error', 'Failed to load posts. Please check your connection.');
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
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Create post error:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postUserInfo}>
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
        </View>
        <Pressable>
          <MoreVertical color={Theme.colors.textMuted} size={20} />
        </Pressable>
      </View>

      {item.caption ? <Text style={styles.postCaption}>{item.caption}</Text> : null}

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.postActions}>
        <Pressable style={styles.postAction}>
          <Heart color={Theme.colors.textSecondary} size={22} />
        </Pressable>
        <Pressable style={styles.postAction}>
          <MessageSquare color={Theme.colors.textSecondary} size={22} />
        </Pressable>
        <Pressable style={styles.postAction}>
          <Share2 color={Theme.colors.textSecondary} size={22} />
        </Pressable>
      </View>
    </View>
  );

  const FeedHeader = () => (
    <View>
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
            <Text style={styles.welcomeTitle}>Your Network</Text>
            <Text style={styles.welcomeSubtitle}>Stay connected with your peers.</Text>
            <Pressable style={styles.exploreBtn} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.exploreBtnText}>Create Post</Text>
            </Pressable>
          </View>
          <LayoutGrid color={Theme.colors.primary} size={60} opacity={0.1} style={styles.bgIcon} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
        </View>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
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
    </View>
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
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: Theme.spacing.xl,
  },
  innerContent: {
    paddingHorizontal: Theme.spacing.lg,
  },
  welcomeCard: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: Theme.spacing.xl,
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
  postCard: {
    backgroundColor: Theme.colors.surface,
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
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
    height: 300,
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

