import { api } from './client.js';
import { getColumns } from './columns.js';

export async function getCards(spaceId, boardId = null) {
  let url = `/spaces/${spaceId}/cards`;
  if (boardId) {
    url += `?board_id=${boardId}`;
  }
  const response = await api.get(url);
  return response.data;
}

export async function getCard(cardId) {
  const response = await api.get(`/cards/${cardId}`);
  return response.data;
}

export async function createChecklist(cardId, name) {
  const response = await api.post(`/cards/${cardId}/checklists`, { name });
  return response.data;
}

export async function deleteChecklist(cardId, checklistId) {
  const response = await api.delete(`/cards/${cardId}/checklists/${checklistId}`);
  return response.data;
}

export async function updateChecklist(cardId, checklistId, data) {
  const response = await api.patch(`/cards/${cardId}/checklists/${checklistId}`, data);
  return response.data;
}

export async function createCard(data) {
  const response = await api.post('/cards', data);
  return response.data;
}

export async function updateCard(cardId, data) {
  const response = await api.patch(`/cards/${cardId}`, data);
  return response.data;
}

export async function deleteCard(cardId) {
  const response = await api.delete(`/cards/${cardId}`);
  return response.data;
}

export async function moveCard(cardId, columnId, laneId = null) {
  // Валидация: проверяем, что карточка существует и получаем её board_id
  let card;
  try {
    card = await getCard(cardId);
  } catch (error) {
    throw new Error(`Card with ID ${cardId} not found`);
  }

  // Валидация: проверяем, что колонка существует на той же доске
  // Получаем все колонки доски карточки
  let columns;
  try {
    columns = await getColumns(card.board_id);
  } catch (error) {
    throw new Error(`Failed to get columns for board ${card.board_id}`);
  }

  // Проверяем, что колонка с указанным ID существует на этой доске
  const targetColumn = columns.find(c => c.id === columnId);
  if (!targetColumn) {
    throw new Error(
      `Column with ID ${columnId} not found on board ${card.board_id}. ` +
      `Available columns on this board: ${columns.map(c => `${c.id} (${c.title})`).join(', ')}`
    );
  }

  const data = { column_id: columnId };
  if (laneId) data.lane_id = laneId;
  const response = await api.patch(`/cards/${cardId}`, data);
  return response.data;
}

export async function assignCard(cardId, userId) {
  const response = await api.patch(`/cards/${cardId}`, {
    members: [{ id: userId }]
  });
  return response.data;
}

export async function unassignCard(cardId, userId) {
  const response = await api.patch(`/cards/${cardId}`, {
    members_remove: [userId]
  });
  return response.data;
}

export async function archiveCard(cardId) {
  const response = await api.patch(`/cards/${cardId}`, {
    condition: 2
  });
  return response.data;
}

export async function unarchiveCard(cardId) {
  const response = await api.patch(`/cards/${cardId}`, {
    condition: 1
  });
  return response.data;
}

export async function addTag(cardId, tagName) {
  const response = await api.post(`/cards/${cardId}/tags`, { name: tagName });
  return response.data;
}

export async function removeTag(cardId, tagName) {
  const card = await getCard(cardId);
  const tag = card.tags?.find(t => t.name === tagName);
  if (!tag) {
    throw new Error(`Tag "${tagName}" not found on card`);
  }
  const response = await api.delete(`/cards/${cardId}/tags/${tag.id}`);
  return response.data;
}

export async function setTags(cardId, tagNames) {
  const tags = tagNames.map(name => ({ name }));
  const response = await api.patch(`/cards/${cardId}`, {
    tags
  });
  return response.data;
}

export async function toggleChecklistItem(checklistId, itemId, checked) {
  const response = await api.patch(`/checklists/${checklistId}/items/${itemId}`, {
    checked
  });
  return response.data;
}

export async function addChecklistItem(checklistId, text) {
  const response = await api.post(`/checklists/${checklistId}/items`, { text });
  return response.data;
}

export async function deleteChecklistItem(checklistId, itemId) {
  const response = await api.delete(`/checklists/${checklistId}/items/${itemId}`);
  return response.data;
}
