import React, { useState, useEffect, useCallback } from 'react';
import { Attachment } from '@/app/types';
import { fetchAttachmentsForDefect, uploadAttachment, deleteAttachment } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import styles from './AttachmentSection.module.scss';

interface AttachmentSectionProps {
  defectId: number;
}

const AttachmentSection = ({ defectId }: AttachmentSectionProps) => {
  const { token, user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAttachments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAttachments = await fetchAttachmentsForDefect(token, defectId);
      setAttachments(fetchedAttachments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить вложения.');
    } finally {
      setIsLoading(false);
    }
  }, [token, defectId]);

  useEffect(() => {
    getAttachments();
  }, [getAttachments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile) {
      setError('Пожалуйста, выберите файл для загрузки.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // Assuming the backend endpoint handles the defect_id from the URL path
      await uploadAttachment(token, defectId, selectedFile as File);
      setSelectedFile(null);
      getAttachments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!token || !confirm('Вы уверены, что хотите удалить это вложение?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await deleteAttachment(token, defectId, attachmentId);
      getAttachments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить вложение.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (filePath: string) => {
    // В реальном приложении здесь будет логика для скачивания файла с бэкенда
    // Например, window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL}/attachments/download/${attachmentId}`);
    alert(`Скачивание файла: ${filePath}`);
  };

  const canManageAttachments = user && (user.role === 'manager' || user.role === 'engineer');

  return (
    <div className={styles.attachmentSection}>
      <h2>Вложения</h2>
      {error && <p className={styles.error}>{error}</p>}
      {isLoading && <p>Загрузка вложений...</p>}

      <ul className={styles.attachmentList}>
        {attachments.length === 0 ? (
          <li>Нет вложений.</li>
        ) : (
          attachments.map((attachment) => (
            <li key={attachment.id} className={styles.attachmentItem}>
              <span onClick={() => handleDownload(attachment.file_path)} className={styles.fileName}>
                {attachment.filename}
              </span>
              {canManageAttachments && (
                <button onClick={() => handleDelete(attachment.id)} disabled={isLoading} className={styles.deleteButton}>
                  Удалить
                </button>
              )}
            </li>
          ))
        )}
      </ul>

      {canManageAttachments && (
        <form onSubmit={handleUpload} className={styles.uploadForm}>
          <input type="file" onChange={handleFileChange} disabled={isLoading} />
          <button type="submit" disabled={isLoading || !selectedFile} className={styles.uploadButton}>
            Загрузить
          </button>
        </form>
      )}
    </div>
  );
};

export default AttachmentSection;
