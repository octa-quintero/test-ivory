import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Post } from '../types';
import LikeButton from './LikeButton';

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onCommentsPress: (postId: string) => void;
  onEdit: (post: Post) => void;
  onDelete: (postId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CommentIcon() {
  return (
    <View style={commentIcon.bubble}>
      <View style={commentIcon.dot} />
      <View style={commentIcon.dot} />
      <View style={commentIcon.dot} />
    </View>
  );
}

const commentIcon = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#6b6f85',
  },
});

export default function PostCard({
  post,
  currentUserId,
  onCommentsPress,
  onEdit,
  onDelete,
}: PostCardProps) {
  const isOwn = currentUserId === post.authorId;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {post.author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorBlock}>
          <Text style={styles.author}>{post.author.name}</Text>
          <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
        </View>
        {isOwn && (
          <View style={styles.ownActions}>
            <Pressable style={styles.editBtn} onPress={() => onEdit(post)} hitSlop={6}>
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={() => onDelete(post.id)} hitSlop={6}>
              <Text style={styles.deleteIcon}>×</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.body}>{post.body}</Text>

      <View style={styles.footer}>
        <LikeButton
          postId={post.id}
          likedByMe={post.likedByMe}
          likesCount={post.likesCount}
        />
        <Pressable
          style={styles.commentsButton}
          onPress={() => onCommentsPress(post.id)}
        >
          <CommentIcon />
          <Text style={styles.commentsText}>{post.commentsCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e2038',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  header: {
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
  authorBlock: {
    gap: 2,
    flex: 1,
  },
  ownActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#252740',
    borderWidth: 1,
    borderColor: '#C9B99A44',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderColor: '#5c2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#fc8181',
    lineHeight: 20,
    fontWeight: '700',
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9B99A',
  },
  date: {
    fontSize: 12,
    color: '#6b6f85',
  },
  body: {
    fontSize: 15,
    color: '#d4d6e8',
    lineHeight: 23,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#2e3048',
  },
  commentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#252740',
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  commentsText: {
    fontSize: 13,
    color: '#6b6f85',
    fontWeight: '500',
  },
});
