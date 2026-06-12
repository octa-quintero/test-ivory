import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import CommentItem from '../../../components/CommentItem';
import * as endpoints from '../../../api/endpoints';
import { useAuthStore } from '../../../stores/authStore';
import { useFeedStore } from '../../../stores/feedStore';
import type { Comment } from '../../../types';

const MAX_COMMENT_LENGTH = 500;

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const updateCommentsCount = useFeedStore((state) => state.updateCommentsCount);
  const currentUser = useAuthStore((state) => state.user);
  const listRef = useRef<FlatList<Comment>>(null);

  useEffect(() => {
    void loadComments();
  }, [postId]);

  const loadComments = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { comments: fetched } = await endpoints.getComments(postId);
      setComments(fetched);
    } catch {
      setError('Impossibile caricare i commenti.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!text.trim()) {
      setInputError('Il commento non può essere vuoto.');
      return;
    }
    if (text.trim().length > MAX_COMMENT_LENGTH) {
      setInputError(`Massimo ${MAX_COMMENT_LENGTH} caratteri.`);
      return;
    }
    setInputError(null);
    setSending(true);
    try {
      if (editingCommentId) {
        const { comment } = await endpoints.updateComment(postId, editingCommentId, text.trim());
        setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
        setEditingCommentId(null);
      } else {
        const { comment, commentsCount } = await endpoints.createComment(postId, text.trim());
        setComments((prev) => [...prev, comment]);
        updateCommentsCount(postId, commentsCount);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
      setText('');
    } catch {
      setInputError(
        editingCommentId ? 'Errore durante la modifica. Riprova.' : "Errore durante l'invio. Riprova.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (comment: Comment): void => {
    setEditingCommentId(comment.id);
    setText(comment.body);
    setInputError(null);
  };

  const cancelEdit = (): void => {
    setEditingCommentId(null);
    setText('');
    setInputError(null);
  };

  const handleDelete = async (commentId: string): Promise<void> => {
    try {
      const { commentsCount } = await endpoints.deleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      updateCommentsCount(postId, commentsCount);
    } catch {
      setInputError('Impossibile eliminare il commento. Riprova.');
    }
  };

  const charCount = text.length;
  const nearLimit = charCount > MAX_COMMENT_LENGTH * 0.8;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C9B99A" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadComments()}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<Comment>
          ref={listRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              currentUserId={currentUser?.id ?? null}
              onEdit={handleEdit}
              onDelete={(id) => void handleDelete(id)}
            />
          )}
          contentContainerStyle={comments.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nessun commento ancora.</Text>
              <Text style={styles.emptySubtext}>Sii il primo a commentare!</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <View style={styles.inputArea}>
        {editingCommentId ? (
          <View style={styles.editingBar}>
            <Text style={styles.editingText}>Stai modificando un commento</Text>
            <Pressable onPress={cancelEdit} hitSlop={8}>
              <Text style={styles.editingCancel}>Annulla</Text>
            </Pressable>
          </View>
        ) : null}
        {inputError ? (
          <Text style={styles.inputError}>{inputError}</Text>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Scrivi un commento…"
            placeholderTextColor="#6b6f85"
            value={text}
            onChangeText={(val) => {
              setText(val);
              if (inputError) setInputError(null);
            }}
            multiline
            maxLength={MAX_COMMENT_LENGTH}
            editable={!sending}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#17182B" />
            ) : (
              <Text style={styles.sendText}>{editingCommentId ? 'Salva' : 'Invia'}</Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.counter, nearLimit && styles.counterWarn]}>
          {charCount}/{MAX_COMMENT_LENGTH}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#17182B',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 24,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: 4,
  },
  emptyText: {
    fontSize: 15,
    color: '#a0a3b1',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b6f85',
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
  },

  // Input area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#2e3048',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#1e2038',
    gap: 6,
  },
  inputError: {
    fontSize: 13,
    color: '#fc8181',
    paddingHorizontal: 2,
  },
  editingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  editingText: {
    fontSize: 12,
    color: '#C9B99A',
    fontStyle: 'italic',
  },
  editingCancel: {
    fontSize: 12,
    color: '#6b6f85',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#e8e8f0',
    maxHeight: 100,
    backgroundColor: '#17182B',
  },
  sendButton: {
    backgroundColor: '#C9B99A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#17182B',
    fontWeight: '700',
    fontSize: 14,
  },
  counter: {
    fontSize: 11,
    color: '#6b6f85',
    textAlign: 'right',
  },
  counterWarn: {
    color: '#f6ad55',
  },
});
