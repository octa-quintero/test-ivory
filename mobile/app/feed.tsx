import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PostCard from '../components/PostCard';
import { useAuthStore } from '../stores/authStore';
import { useFeedStore } from '../stores/feedStore';
import type { Post } from '../types';

function HeaderTitle() {
  return (
    <View style={header.container}>
      <Image
        source={require('../assets/images/logo-vector.png')}
        style={header.logo}
        resizeMode="contain"
      />
      <View style={header.divider} />
      <Text style={header.title}>Il mio Feed</Text>
    </View>
  );
}

const header = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 52,
    height: 22,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#2e3048',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e8e8f0',
    letterSpacing: 0.2,
  },
});

const MAX_POST_LENGTH = 500;

export default function FeedScreen() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const posts = useFeedStore((state) => state.posts);
  const loading = useFeedStore((state) => state.loading);
  const loadingMore = useFeedStore((state) => state.loadingMore);
  const error = useFeedStore((state) => state.error);
  const nextCursor = useFeedStore((state) => state.nextCursor);
  const fetchFeed = useFeedStore((state) => state.fetchFeed);
  const loadMore = useFeedStore((state) => state.loadMore);
  const createPost = useFeedStore((state) => state.createPost);
  const updatePost = useFeedStore((state) => state.updatePost);
  const deletePost = useFeedStore((state) => state.deletePost);
  const likeError = useFeedStore((state) => state.likeError);
  const clearLikeError = useFeedStore((state) => state.clearLikeError);

  const [composeOpen, setComposeOpen] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!likeError) return;
    const timer = setTimeout(clearLikeError, 4000);
    return () => clearTimeout(timer);
  }, [likeError, clearLikeError]);

  useEffect(() => {
    if (!deleteError) return;
    const timer = setTimeout(() => setDeleteError(''), 4000);
    return () => clearTimeout(timer);
  }, [deleteError]);

  const handleLogout = (): void => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleCommentsPress = (postId: string): void => {
    router.push(`/posts/${postId}/comments`);
  };

  const handlePublish = async (): Promise<void> => {
    if (!postBody.trim()) { setComposeError('Il post non può essere vuoto.'); return; }
    if (postBody.trim().length > MAX_POST_LENGTH) {
      setComposeError(`Massimo ${MAX_POST_LENGTH} caratteri.`);
      return;
    }
    setComposeError('');
    setPublishing(true);
    try {
      if (editingPostId) {
        await updatePost(editingPostId, postBody.trim());
      } else {
        await createPost(postBody.trim());
      }
      setPostBody('');
      setEditingPostId(null);
      setComposeOpen(false);
    } catch {
      setComposeError(
        editingPostId
          ? 'Errore durante la modifica. Riprova.'
          : 'Errore durante la pubblicazione. Riprova.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleEditPost = (post: Post): void => {
    setPostBody(post.body);
    setEditingPostId(post.id);
    setComposeError('');
    setComposeOpen(true);
  };

  const handleDeletePost = (postId: string): void => {
    Alert.alert('Elimina post', 'Vuoi davvero eliminare questo post?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
          } catch {
            setDeleteError('Impossibile eliminare il post. Riprova.');
          }
        },
      },
    ]);
  };

  const closeCompose = (): void => {
    setComposeOpen(false);
    setPostBody('');
    setEditingPostId(null);
    setComposeError('');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C9B99A" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void fetchFeed()}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Compose modal */}
      <Modal
        visible={composeOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCompose}
      >
        <KeyboardAvoidingView
          style={compose.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={compose.sheet}>
            <View style={compose.header}>
              <Text style={compose.headerTitle}>
                {editingPostId ? 'Modifica post' : 'Nuovo post'}
              </Text>
              <Pressable onPress={closeCompose} hitSlop={12}>
                <Text style={compose.cancelText}>Annulla</Text>
              </Pressable>
            </View>

            <TextInput
              style={compose.input}
              value={postBody}
              onChangeText={(t) => { setPostBody(t); setComposeError(''); }}
              placeholder="Cosa vuoi condividere?"
              placeholderTextColor="#6b6f85"
              multiline
              maxLength={MAX_POST_LENGTH + 1}
              autoFocus
              editable={!publishing}
            />

            <View style={compose.footer}>
              <Text style={[compose.counter, postBody.length > MAX_POST_LENGTH && compose.counterOver]}>
                {postBody.length}/{MAX_POST_LENGTH}
              </Text>
              {composeError ? <Text style={compose.error}>{composeError}</Text> : null}
              <Pressable
                style={[compose.publishBtn, (publishing || !postBody.trim()) && compose.publishBtnDisabled]}
                onPress={() => void handlePublish()}
                disabled={publishing || !postBody.trim()}
              >
                {publishing
                  ? <ActivityIndicator size="small" color="#17182B" />
                  : <Text style={compose.publishBtnText}>{editingPostId ? 'Salva' : 'Pubblica'}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: '#17182B' },
          headerShadowVisible: false,
          headerTitle: () => <HeaderTitle />,
          headerLeft: () => null,
          headerRight: () => (
            <View style={styles.headerActions}>
              {user?.role === 'admin' && (
                <Pressable
                  onPress={() => router.push('/admin')}
                  style={styles.adminBtn}
                >
                  <Text style={styles.adminText}>Admin</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push('/profile')}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>
                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Esci</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {likeError ? (
        <Pressable style={styles.likeErrorBanner} onPress={clearLikeError}>
          <Text style={styles.likeErrorText}>{likeError}</Text>
        </Pressable>
      ) : null}
      {deleteError ? (
        <Pressable style={styles.likeErrorBanner} onPress={() => setDeleteError('')}>
          <Text style={styles.likeErrorText}>{deleteError}</Text>
        </Pressable>
      ) : null}

      <FlatList<Post>
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id ?? null}
            onCommentsPress={handleCommentsPress}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
          />
        )}
        onEndReached={() => {
          if (nextCursor) void loadMore();
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nessun post ancora.</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerSpinner} color="#C9B99A" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB: create new post */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          setPostBody('');
          setEditingPostId(null);
          setComposeError('');
          setComposeOpen(true);
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#17182B',
  },
  centered: {
    flex: 1,
    backgroundColor: '#17182B',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#fc8181',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#C9B99A',
    borderRadius: 10,
  },
  retryText: {
    color: '#17182B',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b6f85',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2e3048',
    borderWidth: 1,
    borderColor: '#C9B99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9B99A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2e3048',
    borderWidth: 1,
    borderColor: '#C9B99A44',
  },
  adminText: {
    color: '#C9B99A',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: 4,
  },
  logoutText: {
    color: '#6b6f85',
    fontSize: 14,
    fontWeight: '500',
  },
  footerSpinner: {
    paddingVertical: 20,
  },
  likeErrorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2d1a1a',
    borderWidth: 1,
    borderColor: '#5c2a2a',
  },
  likeErrorText: {
    color: '#fc8181',
    fontSize: 13,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C9B99A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#17182B',
    lineHeight: 32,
  },
});

const compose = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1e2038',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
    borderTopWidth: 1,
    borderColor: '#2e3048',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e8e8f0',
  },
  cancelText: {
    fontSize: 15,
    color: '#6b6f85',
  },
  input: {
    backgroundColor: '#17182B',
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#e8e8f0',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    gap: 8,
  },
  counter: {
    fontSize: 12,
    color: '#6b6f85',
    textAlign: 'right',
  },
  counterOver: {
    color: '#fc8181',
  },
  error: {
    fontSize: 13,
    color: '#fc8181',
    textAlign: 'center',
  },
  publishBtn: {
    backgroundColor: '#C9B99A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  publishBtnDisabled: {
    opacity: 0.4,
  },
  publishBtnText: {
    color: '#17182B',
    fontSize: 15,
    fontWeight: '700',
  },
});
