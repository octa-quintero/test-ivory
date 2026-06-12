import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as endpoints from '../api/endpoints';
import type { AdminPost, User } from '../types';

type Tab = 'posts' | 'users';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  post: AdminPost | null;
  onClose: () => void;
  onSave: (postId: string, body: string) => Promise<void>;
}

function EditModal({ post, onClose, onSave }: EditModalProps) {
  const [body, setBody] = useState(post?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (): Promise<void> => {
    if (!post) return;
    if (!body.trim()) { setError('Il testo non può essere vuoto'); return; }
    if (body.trim().length > 500) { setError('Massimo 500 caratteri'); return; }
    setSaving(true);
    try {
      await onSave(post.id, body.trim());
      onClose();
    } catch {
      setError('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={post !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Modifica post</Text>

          <TextInput
            style={modal.input}
            value={body}
            onChangeText={(t) => { setBody(t); setError(''); }}
            multiline
            numberOfLines={6}
            maxLength={500}
            placeholderTextColor="#6b6f85"
            placeholder="Testo del post…"
          />

          <Text style={modal.counter}>{body.length}/500</Text>

          {error ? <Text style={modal.error}>{error}</Text> : null}

          <View style={modal.actions}>
            <Pressable style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Annulla</Text>
            </Pressable>
            <Pressable
              style={[modal.saveBtn, saving && modal.disabled]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#17182B" />
                : <Text style={modal.saveText}>Salva</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#1e2038',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e8e8f0',
  },
  input: {
    backgroundColor: '#17182B',
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 10,
    padding: 12,
    color: '#e8e8f0',
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  counter: {
    fontSize: 12,
    color: '#6b6f85',
    textAlign: 'right',
  },
  error: {
    color: '#fc8181',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#252740',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  cancelText: {
    color: '#a0a3b1',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#C9B99A',
    alignItems: 'center',
  },
  saveText: {
    color: '#17182B',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});

// ─── Post row ────────────────────────────────────────────────────────────────

interface PostRowProps {
  post: AdminPost;
  onEdit: (post: AdminPost) => void;
  onDelete: (postId: string) => void;
}

function PostRow({ post, onEdit, onDelete }: PostRowProps) {
  return (
    <View style={row.card}>
      <View style={row.meta}>
        <Text style={row.id} numberOfLines={1}>{post.id}</Text>
        <Text style={row.date}>{formatDate(post.createdAt)}</Text>
      </View>
      <Text style={row.body} numberOfLines={2}>{post.body}</Text>
      <View style={row.stats}>
        <Text style={row.stat}>♥ {post.likesCount}</Text>
        <Text style={row.stat}>💬 {post.commentsCount}</Text>
      </View>
      <View style={row.actions}>
        <Pressable style={row.editBtn} onPress={() => onEdit(post)} hitSlop={6}>
          <Text style={row.editIcon}>✎</Text>
        </Pressable>
        <Pressable style={row.deleteBtn} onPress={() => onDelete(post.id)} hitSlop={6}>
          <Text style={row.deleteIcon}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── User row ────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: User;
  onDelete: (userId: string) => void;
}

function UserRow({ user, onDelete }: UserRowProps) {
  return (
    <View style={row.card}>
      <View style={row.userHeader}>
        <View style={row.avatar}>
          <Text style={row.avatarLetter}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={row.userInfo}>
          <Text style={row.userName}>{user.name}</Text>
          <Text style={row.userEmail}>{user.email}</Text>
        </View>
        <View style={[row.roleBadge, user.role === 'admin' && row.roleBadgeAdmin]}>
          <Text style={[row.roleText, user.role === 'admin' && row.roleTextAdmin]}>
            {user.role}
          </Text>
        </View>
      </View>
      <View style={row.actions}>
        <Pressable
          style={[row.deleteBtn, user.role === 'admin' && row.deleteBtnDisabled]}
          onPress={() => user.role !== 'admin' && onDelete(user.id)}
          disabled={user.role === 'admin'}
          hitSlop={6}
        >
          <Text style={[row.deleteIcon, user.role === 'admin' && row.deleteIconDisabled]}>
            ×
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  card: {
    backgroundColor: '#1e2038',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: {
    fontSize: 11,
    color: '#6b6f85',
    fontFamily: 'monospace',
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: '#6b6f85',
  },
  body: {
    fontSize: 14,
    color: '#d4d6e8',
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    fontSize: 12,
    color: '#6b6f85',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2e3048',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#252740',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9B99A44',
  },
  editIcon: {
    fontSize: 13,
    color: '#C9B99A',
    lineHeight: 16,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2d1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5c2a2a',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#fc8181',
    lineHeight: 20,
    fontWeight: '700',
  },
  deleteBtnDisabled: {
    backgroundColor: '#252740',
    borderColor: '#2e3048',
  },
  deleteIconDisabled: {
    color: '#3a3d52',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2e3048',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9B99A',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C9B99A',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8e8f0',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b6f85',
  },
  roleBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#252740',
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  roleBadgeAdmin: {
    backgroundColor: '#2a2518',
    borderColor: '#C9B99A44',
  },
  roleText: {
    fontSize: 11,
    color: '#6b6f85',
    fontWeight: '600',
  },
  roleTextAdmin: {
    color: '#C9B99A',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const [postsRes, usersRes] = await Promise.all([
        endpoints.getAdminPosts(),
        endpoints.getAdminUsers(),
      ]);
      setPosts(postsRes.posts);
      setUsers(usersRes.users);
    } catch {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDeletePost = (postId: string): void => {
    Alert.alert('Elimina post', 'Sei sicuro? Questa azione è irreversibile.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await endpoints.deleteAdminPost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch {
            Alert.alert('Errore', 'Impossibile eliminare il post');
          }
        },
      },
    ]);
  };

  const handleSavePost = async (postId: string, body: string): Promise<void> => {
    const updated = await endpoints.updateAdminPost(postId, body);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  };

  const handleDeleteUser = (userId: string): void => {
    Alert.alert('Elimina utente', 'Verranno eliminati anche i suoi post e commenti.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await endpoints.deleteAdminUser(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
          } catch {
            Alert.alert('Errore', 'Impossibile eliminare l\'utente');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Tab switcher */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
          onPress={() => setTab('posts')}
        >
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>
            Post ({posts.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
            Utenti ({users.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9B99A" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadData()}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      ) : tab === 'posts' ? (
        <FlatList<AdminPost>
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onEdit={setEditingPost}
              onDelete={handleDeletePost}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun post trovato.</Text>
          }
        />
      ) : (
        <FlatList<User>
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserRow user={item} onDelete={handleDeleteUser} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun utente trovato.</Text>
          }
        />
      )}

      <EditModal
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleSavePost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#17182B',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#1e2038',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2e3048',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b6f85',
  },
  tabTextActive: {
    color: '#C9B99A',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#fc8181',
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#C9B99A',
    borderRadius: 10,
  },
  retryText: {
    color: '#17182B',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    color: '#6b6f85',
    textAlign: 'center',
    marginTop: 40,
  },
});
