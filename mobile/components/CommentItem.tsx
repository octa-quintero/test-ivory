import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Comment } from '../types';

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function avatarLabel(authorId: string): string {
  const match = authorId.match(/\d+$/);
  return match ? match[0] : authorId.charAt(0).toUpperCase();
}

export default function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const isOwn = currentUserId === comment.authorId;

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarLabel(comment.authorId)}</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.bubbleHeader}>
          <Text style={styles.author}>@{comment.authorId}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.date}>{formatDate(comment.createdAt)}</Text>
            {isOwn && (
              <>
                <Pressable
                  onPress={() => onEdit(comment)}
                  hitSlop={8}
                  style={styles.editBtn}
                >
                  <Text style={styles.editText}>✎</Text>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(comment.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>×</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
        <Text style={styles.body}>{comment.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e3048',
    borderWidth: 1,
    borderColor: '#C9B99A44',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9B99A',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#1e2038',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C9B99A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 11,
    color: '#6b6f85',
  },
  editBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#252740',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9B99A44',
  },
  editText: {
    color: '#C9B99A',
    fontSize: 10,
    lineHeight: 12,
  },
  deleteBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2d1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5c2a2a',
  },
  deleteText: {
    color: '#fc8181',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#d4d6e8',
    lineHeight: 21,
  },
});
