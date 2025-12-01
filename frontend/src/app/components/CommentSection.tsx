import React, { useState, useEffect, useCallback } from 'react';
import { Comment, CommentCreate, User } from '@/app/types';
import { fetchCommentsForDefect, createComment } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import styles from './CommentSection.module.scss';

interface CommentSectionProps {
  defectId: number;
  users: User[];
}

const CommentSection = ({ defectId, users }: CommentSectionProps) => {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getComments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedComments = await fetchCommentsForDefect(token, defectId);
      setComments(fetchedComments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить комментарии.');
    } finally {
      setIsLoading(false);
    }
  }, [token, defectId]);

  useEffect(() => {
    getComments();
  }, [getComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCommentContent.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const commentData: CommentCreate = {
        content: newCommentContent,
        defect_id: defectId,
      };
      await createComment(token, defectId, commentData);
      setNewCommentContent('');
      getComments(); // Обновить список комментариев
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить комментарий.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthorUsername = (authorId: number) => {
    const author = users.find(u => u.id === authorId);
    return author ? author.username : 'Неизвестный пользователь';
  };

  return (
    <div className={styles.commentSection}>
      <h2>Комментарии</h2>
      {error && <p className={styles.error}>{error}</p>}
      {isLoading && <p>Загрузка комментариев...</p>}

      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <p>Пока нет комментариев.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <p className={styles.commentAuthor}>
                <strong>{getAuthorUsername(comment.author_id)}</strong>{' '}
                <span className={styles.commentDate}>{new Date(comment.created_at).toLocaleString()}</span>
              </p>
              <p className={styles.commentContent}>{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {user && ( // Разрешить комментировать только авторизованным пользователям
        <form onSubmit={handleAddComment} className={styles.commentForm}>
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="Добавить комментарий..."
            rows={4}
            required
            disabled={isLoading}
          ></textarea>
          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            Добавить комментарий
          </button>
        </form>
      )}
    </div>
  );
};

export default CommentSection;
