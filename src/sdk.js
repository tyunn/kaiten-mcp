import * as api from './api/index.js';
import * as gitApi from './api/git.js';
import { getConfig } from './utils/config.js';
import fs from 'fs/promises';
import path from 'path';
import { getCardTempDir, cleanTempDir } from './utils/temp.js';

export class KaitenSDK {
  constructor(config = null) {
    if (config) {
      this.config = config;
    } else {
      this.config = getConfig();
    }
  }

  _validateSpaceId(spaceId) {
    if (!this.config.allowedSpaceIds || !spaceId) return true;
    if (!this.config.allowedSpaceIds.includes(spaceId)) {
      throw new Error(`Space ID ${spaceId} is not in allowed list`);
    }
    return true;
  }

  _validateBoardId(boardId) {
    if (!this.config.allowedBoardIds || !boardId) return true;
    if (!this.config.allowedBoardIds.includes(boardId)) {
      throw new Error(`Board ID ${boardId} is not in allowed list`);
    }
    return true;
  }

  async _validateCardId(cardId) {
    if (!this.config.allowedBoardIds || !cardId) return true;
    try {
      const card = await api.getCard(cardId);
      if (card?.board_id && !this.config.allowedBoardIds.includes(card.board_id)) {
        throw new Error(`Card ${cardId} belongs to board ${card.board_id} which is not in allowed list`);
      }
    } catch (error) {
      if (error.message.includes('not in allowed list')) {
        throw error;
      }
    }
    return true;
  }

  getCards(spaceId = null, boardId = null) {
    const id = spaceId || this.config.defaultSpaceId;
    this._validateSpaceId(id);
    if (boardId) {
      this._validateBoardId(boardId);
      return api.getCards(id, boardId);
    }
    return api.getCards(id);
  }

  async getSpaces() {
    const spaces = await api.getSpaces();
    if (!this.config.allowedSpaceIds) return spaces;
    return spaces.filter(s => this.config.allowedSpaceIds.includes(s.id));
  }

  async getSpaceId(spaceTitle) {
    const spaces = await api.getSpaces();
    const space = spaces.find(s => s.title === spaceTitle || s.id === spaceTitle);
    if (!space) {
      throw new Error(`Space "${spaceTitle}" not found`);
    }
    return space.id;
  }

  async getBoardId(boardTitle, spaceId = null) {
    const id = spaceId || this.config.defaultSpaceId;
    this._validateSpaceId(id);
    const boards = await api.getBoards(id);
    const board = boards.find(b => b.title === boardTitle || b.id === boardTitle);
    if (!board) {
      throw new Error(`Board "${boardTitle}" not found`);
    }
    return board.id;
  }

  async getCard(cardId, minimal = false) {
    await this._validateCardId(cardId);
    const card = await api.getCard(cardId);
    if (minimal) {
      return {
        id: card.id,
        title: card.title,
        description: card.description,
        board_id: card.board_id,
        column_id: card.column_id,
        condition: card.condition,
        tags: card.tags,
        parents_count: card.parents_count,
        children_count: card.children_count
      };
    }
    return card;
  }

  async createCard({ title, description, boardId, columnId, laneId, tags, size, plannedStart, plannedEnd, parentId = null }) {
    this._validateBoardId(boardId);
    const data = {
      title,
      board_id: boardId,
      column_id: columnId
    };
    
    if (description) data.description = description;
    if (laneId) data.lane_id = laneId;
    if (tags) data.tags = tags.map(t => typeof t === 'string' ? { name: t } : t);
    if (size) data.size = size;
    if (plannedStart) data.planned_start = plannedStart;
    if (plannedEnd) data.planned_end = plannedEnd;
    if (parentId) data.parent_id = parentId;

    return api.createCard(data);
  }

  async updateCard(cardId, data) {
    await this._validateCardId(cardId);
    return api.updateCard(cardId, data);
  }

  async deleteCard(cardId) {
    await this._validateCardId(cardId);
    return api.deleteCard(cardId);
  }

  async moveToColumn(cardId, columnId, laneId = null) {
    await this._validateCardId(cardId);
    await api.moveCard(cardId, columnId, laneId);
    return { success: true, cardId, columnId, laneId };
  }

  async assignTo(cardId, userId) {
    await this._validateCardId(cardId);
    await api.assignCard(cardId, userId);
    return { success: true, cardId, userId };
  }

  async unassignFrom(cardId, userId) {
    await this._validateCardId(cardId);
    return api.unassignCard(cardId, userId);
  }

  async archive(cardId) {
    await this._validateCardId(cardId);
    return api.archiveCard(cardId);
  }

  async unarchive(cardId) {
    await this._validateCardId(cardId);
    return api.unarchiveCard(cardId);
  }

  async addTag(cardId, tagName) {
    await this._validateCardId(cardId);
    const tag = await api.addTag(cardId, tagName);
    const card = await api.getCard(cardId);
    return {
      id: card.id,
      title: card.title,
      description: card.description,
      board_id: card.board_id,
      column_id: card.column_id,
      condition: card.condition,
      tags: card.tags
    };
  }

  async removeTag(cardId, tagName) {
    await this._validateCardId(cardId);
    await api.removeTag(cardId, tagName);
    const card = await api.getCard(cardId);
    return {
      id: card.id,
      title: card.title,
      description: card.description,
      board_id: card.board_id,
      column_id: card.column_id,
      condition: card.condition,
      tags: card.tags
    };
  }

  async setTags(cardId, tagNames) {
    await this._validateCardId(cardId);
    return api.setTags(cardId, tagNames);
  }

  hasTag(card, tagName) {
    return card.tags?.some(t => t.name === tagName) || false;
  }

  getTags(card) {
    return card.tags?.map(t => t.name) || [];
  }

  async getCardsWithTag(tagName, spaceId = null) {
    const cards = await this.getCards(spaceId);
    return cards.filter(card => this.hasTag(card, tagName));
  }

  async getCardsWithoutTag(tagName, spaceId = null) {
    const cards = await this.getCards(spaceId);
    return cards.filter(card => !this.hasTag(card, tagName));
  }

  async createSubtask(parentId, title, position = 0) {
    await this._validateCardId(parentId);
    return api.createSubtask(parentId, title, position);
  }

  async getSubtasks(cardId, minimal = false) {
    await this._validateCardId(cardId);
    const subtasks = await api.getSubtasks(cardId);
    if (minimal) {
      return subtasks.map(c => ({
        id: c.id,
        title: c.title,
        board_id: c.board_id,
        column_id: c.column_id,
        condition: c.condition,
        parents_count: c.parents_count,
        children_count: c.children_count
      }));
    }
    return subtasks;
  }

  async getAllSubtasks(cardId, minimal = false) {
    await this._validateCardId(cardId);
    const subtasks = await api.getAllSubtasks(cardId);
    if (minimal) {
      return subtasks.map(c => ({
        id: c.id,
        title: c.title,
        board_id: c.board_id,
        column_id: c.column_id,
        condition: c.condition,
        parents_count: c.parents_count,
        children_count: c.children_count
      }));
    }
    return subtasks;
  }

  async getParent(cardId, minimal = false) {
    await this._validateCardId(cardId);
    const parent = await api.getParent(cardId);
    if (minimal && parent) {
      return {
        id: parent.id,
        title: parent.title,
        board_id: parent.board_id,
        column_id: parent.column_id,
        condition: parent.condition
      };
    }
    return parent;
  }

  async attachToParent(cardId, parentId, position = 0) {
    await this._validateCardId(cardId);
    await this._validateCardId(parentId);
    return api.attachToParent(cardId, parentId, position);
  }

  async detachFromParent(cardId) {
    await this._validateCardId(cardId);
    return api.detachFromParent(cardId);
  }

  async createTaskFlow(parentCard, tasks) {
    const createdTasks = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const subtask = await this.createSubtask(parentCard, task.title, i);
      
      if (task.description) {
        await this.updateCard(subtask.id, { description: task.description });
      }
      
      if (task.tags) {
        await this.updateCard(subtask.id, { 
          tags: task.tags.map(t => typeof t === 'string' ? { name: t } : t)
        });
      }

      createdTasks.push({ ...subtask, ...task });
    }

    return createdTasks;
  }

  async addComment(cardId, text, parentId = null) {
    await this._validateCardId(cardId);
    return api.createComment(cardId, text, parentId);
  }

  async getComments(cardId) {
    await this._validateCardId(cardId);
    return api.getComments(cardId);
  }

  async updateComment(commentId, text) {
    return api.updateComment(commentId, text);
  }

  deleteComment(commentId) {
    return api.deleteComment(commentId);
  }

  async getBoardId(spaceId, boardTitle) {
    const boards = await api.getBoards(spaceId);
    const board = boards.find(b => b.title === boardTitle);
    if (!board) {
      throw new Error(`Board "${boardTitle}" not found`);
    }
    return board.id;
  }

  async getColumnId(boardId, columnTitle) {
    this._validateBoardId(boardId);
    const columns = await api.getColumns(boardId);
    const column = columns.find(c => c.title === columnTitle);
    if (!column) {
      throw new Error(`Column "${columnTitle}" not found`);
    }
    return column.id;
  }

  async findUser(query) {
    const users = await api.searchUsers(query);
    if (users.length === 0) {
      throw new Error(`User "${query}" not found`);
    }
    return users[0];
  }

  getCurrentUser() {
    return api.getCurrentUser();
  }

  getBoards(spaceId = null) {
    const id = spaceId || this.config.defaultSpaceId;
    if (!id) {
      throw new Error('Space ID is required. Set KAITEN_DEFAULT_SPACE_ID or pass spaceId parameter.');
    }
    this._validateSpaceId(id);
    return api.getBoards(id);
  }

  getColumns(boardId) {
    this._validateBoardId(boardId);
    return api.getColumns(boardId);
  }

  getUsers() {
    return api.getUsers();
  }

  async getCurrentBranch() {
    return gitApi.getCurrentBranch();
  }

  async createGitBranch(cardId, title) {
    const isRepo = await gitApi.isGitRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }
    const cardTitle = title || (await api.getCard(cardId)).title;
    return gitApi.createBranch(cardId, cardTitle);
  }

  async checkoutGitBranch(cardId, title) {
    const isRepo = await gitApi.isGitRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }
    const cardTitle = title || (await api.getCard(cardId)).title;
    return gitApi.checkoutBranch(cardId, cardTitle);
  }

  async commitGit(cardId, message) {
    return gitApi.commitChanges(cardId, message);
  }

  async getGitChanges() {
    return gitApi.getCurrentChanges();
  }

  async getGitStatus() {
    return gitApi.getCurrentChanges();
  }

  async gitAddAll() {
    return gitApi.addAllFiles();
  }

  async gitPush(cardId, title) {
    const isRepo = await gitApi.isGitRepo();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }
    const branchName = await this.createGitBranch(cardId, title);
    return gitApi.pushBranch(branchName);
  }

  async createPullRequest(cardId, title) {
    return gitApi.createPR(cardId, title);
  }

  async getCardFiles(cardId) {
    await this._validateCardId(cardId);
    return api.getCardFiles(cardId);
  }

  async downloadFile(cardId, fileId) {
    await this._validateCardId(cardId);
    return api.downloadFile(cardId, fileId);
  }

  async downloadFileToDisk(cardId, fileId, outputDir = null) {
    await this._validateCardId(cardId);
    const fileData = await this.downloadFile(cardId, fileId);
    const files = await this.getCardFiles(cardId);
    const file = files.find(f => f.id === fileId);
    const filename = file?.name || `file-${fileId}`;
    const dir = outputDir || getCardTempDir(cardId);

    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, fileData);

    return { path: filePath, filename, size: fileData.length };
  }

  async downloadAllCardFiles(cardId, outputDir = null) {
    await this._validateCardId(cardId);
    const files = await this.getCardFiles(cardId);
    const dir = outputDir || getCardTempDir(cardId);

    await fs.mkdir(dir, { recursive: true });

    const results = [];
    for (const file of files) {
      const result = await this.downloadFileToDisk(cardId, file.id, dir);
      results.push({ ...result, id: file.id });
    }
    return results;
  }

  async cleanTempDir(cardId = null) {
    return cleanTempDir(cardId);
  }

  async getChecklists(cardId) {
    await this._validateCardId(cardId);
    const card = await api.getCard(cardId);
    return card.checklists || [];
  }

  async createChecklist(cardId, name) {
    await this._validateCardId(cardId);
    return api.createChecklist(cardId, name);
  }

  async toggleChecklistItem(cardId, checklistId, itemId, checked) {
    await this._validateCardId(cardId);
    return api.toggleChecklistItem(checklistId, itemId, checked);
  }

  async addChecklistItem(cardId, checklistId, text) {
    await this._validateCardId(cardId);
    return api.addChecklistItem(checklistId, text);
  }

  async deleteChecklistItem(cardId, checklistId, itemId) {
    await this._validateCardId(cardId);
    return api.deleteChecklistItem(checklistId, itemId);
  }
}

export function createSDK(config = null) {
  return new KaitenSDK(config);
}
