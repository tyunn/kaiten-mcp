import fs from 'fs/promises';
import path from 'path';

// Временная директория для Kaiten файлов
const BASE_TEMP_DIR = process.env.KAITEN_TEMP_DIR || '/tmp/kaiten';

/**
 * Получить директорию для файлов карточки
 * @param {number} cardId - ID карточки
 * @returns {string} Путь к директории
 */
export function getCardTempDir(cardId) {
  return path.join(BASE_TEMP_DIR, String(cardId));
}

/**
 * Создать временную директорию для карточки
 * @param {number} cardId - ID карточки
 * @returns {Promise<string>} Путь к созданной директории
 */
export async function ensureTempDir(cardId) {
  const dir = getCardTempDir(cardId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Очистить временную директорию
 * @param {number|null} cardId - ID карточки (null = очистить всё)
 * @returns {Promise<number>} Количество удаленных файлов
 */
export async function cleanTempDir(cardId = null) {
  const targetDir = cardId ? getCardTempDir(cardId) : BASE_TEMP_DIR;

  try {
    await fs.access(targetDir);
  } catch {
    return 0; // Директория не существует
  }

  let deletedCount = 0;

  if (cardId) {
    // Очищаем только директорию карточки
    const files = await fs.readdir(targetDir);
    for (const file of files) {
      const filePath = path.join(targetDir, file);
      await fs.unlink(filePath);
      deletedCount++;
    }
    if (files.length === 0) {
      try {
        await fs.rmdir(targetDir);
      } catch {
        // Игнорируем если директория уже удалена
      }
    }
  } else {
    // Очищаем всю временную директорию
    const entries = await fs.readdir(targetDir);
    for (const entry of entries) {
      const entryPath = path.join(targetDir, entry);
      const stat = await fs.stat(entryPath);
      if (stat.isDirectory()) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entryPath);
      }
      deletedCount++;
    }
  }

  return deletedCount;
}