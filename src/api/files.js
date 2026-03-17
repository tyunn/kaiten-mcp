import { api } from './client.js';

/**
 * Получить список файлов, привязанных к карточке
 * @param {number} cardId - ID карточки
 * @returns {Promise<Array>} Список файлов
 */
export async function getCardFiles(cardId) {
  const response = await api.get(`/cards/${cardId}/files`);
  return response.data;
}

/**
 * Скачать файл как Buffer
 * @param {number} cardId - ID карточки
 * @param {number} fileId - ID файла
 * @returns {Promise<Buffer>} Содержимое файла в виде Buffer
 */
export async function downloadFile(cardId, fileId) {
  const response = await api.get(`/cards/${cardId}/files/${fileId}`, {
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}