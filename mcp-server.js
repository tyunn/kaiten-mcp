#!/usr/bin/env node

import { createSDK } from './src/sdk.js';
import { getConfig } from './src/utils/config.js';

const sdk = createSDK();

// Simple logging
let logLevel = 'info';

try {
  const config = getConfig();
  if (config.logLevel) {
    logLevel = config.logLevel;
  }
} catch (e) {
  // Use default log level
}

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[logLevel];
}

function log(level, message, data) {
  if (shouldLog(level)) {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data !== undefined) {
      console[level](msg, typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console[level](msg);
    }
  }
}

function errorLog(message, data) {
  log('error', message, data);
}

function infoLog(message, data) {
  log('info', message, data);
}

function debugLog(message, data) {
  log('debug', message, data);
}

console.log(`MCP Server starting with log level: ${logLevel}`);

class MCPServer {
  constructor() {
    this.requestId = 0;
    this.tools = this.registerTools();
  }

  registerTools() {
    return [
      {
        name: 'kaiten_spaces',
        description: 'Get list of available Kaiten spaces',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'kaiten_boards',
        description: 'Get list of boards in a space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'Space ID (optional, uses default if not specified)'
            }
          }
        }
      },
      {
        name: 'kaiten_columns',
        description: 'Get list of columns in a board',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'number',
              description: 'Board ID'
            }
          },
          required: ['boardId']
        }
      },
      {
        name: 'kaiten_cards',
        description: 'Get list of cards (optimized format)',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'number',
              description: 'Space ID (optional, uses default if not specified)'
            },
            boardId: {
              type: 'number',
              description: 'Board ID (optional)'
            },
            minimal: {
              type: 'boolean',
              description: 'Return minimal JSON format (token optimized)'
            }
          }
        }
      },
      {
        name: 'kaiten_card',
        description: 'Get card details',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            simple: {
              type: 'boolean',
              description: 'Return human-readable format'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_create_card',
        description: 'Create a new independent card on a board. Use this for creating separate tasks, not child cards/subtasks.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Card title - for an independent task on a board'
            },
            boardId: {
              type: 'number',
              description: 'Board ID where to create the independent card'
            },
            columnId: {
              type: 'number',
              description: 'Column ID where to place the independent card'
            },
            description: {
              type: 'string',
              description: 'Card description (optional)'
            }
          },
          required: ['title', 'boardId', 'columnId']
        }
      },
      {
        name: 'kaiten_update_card',
        description: 'Update a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            data: {
              type: 'string',
              description: 'JSON string with card data to update'
            }
          },
          required: ['cardId', 'data']
        }
      },
      {
        name: 'kaiten_delete_card',
        description: 'Delete a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_move_card',
        description: 'Move a card to different column',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            columnId: {
              type: 'number',
              description: 'Target column ID'
            }
          },
          required: ['cardId', 'columnId']
        }
      },
      {
        name: 'kaiten_assign_card',
        description: 'Assign user to card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            userId: {
              type: 'number',
              description: 'User ID to assign'
            }
          },
          required: ['cardId', 'userId']
        }
      },
      {
        name: 'kaiten_find_cards',
        description: 'Find cards by tag (token optimized - returns only id, title, board_id, column_id, tags)',
        inputSchema: {
          type: 'object',
          properties: {
            tagName: {
              type: 'string',
              description: 'Tag name to filter by'
            },
            boardId: {
              type: 'number',
              description: 'Board ID (optional)'
            }
          },
          required: ['tagName']
        }
      },
      {
        name: 'kaiten_add_comment',
        description: 'Add comment to card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            text: {
              type: 'string',
              description: 'Comment text'
            }
          },
          required: ['cardId', 'text']
        }
      },
      {
        name: 'kaiten_get_comments',
        description: 'Get comments for card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_create_child_card',
        description: 'Create a child card under a parent card. Use this when you need to create a nested task, subtask, or child card.',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: {
              type: 'number',
              description: 'Parent card ID - the card under which to create the child card'
            },
            title: {
              type: 'string',
              description: 'Child card title'
            }
          },
          required: ['parentId', 'title']
        }
      },
      {
        name: 'kaiten_get_child_cards',
        description: 'Get immediate child cards of a parent card (one level only)',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Parent card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_get_all_child_cards',
        description: 'Get all child cards of a parent card recursively (includes nested child cards at all levels)',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Parent card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_get_parent',
        description: 'Get the parent card of a child card/subtask',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_attach_to_parent',
        description: 'Link an existing card as a child/subtask under a parent card. Use this when you already have a card that needs to become a subtask of another card.',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Child card ID to attach'
            },
            parentId: {
              type: 'number',
              description: 'Parent card ID'
            },
            position: {
              type: 'number',
              description: 'Position in parent children list (optional, default 0)'
            }
          },
          required: ['cardId', 'parentId']
        }
      },
      {
        name: 'kaiten_detach_from_parent',
        description: 'Remove parent-child relationship - makes a subtask/child card into an independent card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_add_tag',
        description: 'Add tag to card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            tagName: {
              type: 'string',
              description: 'Tag name'
            }
          },
          required: ['cardId', 'tagName']
        }
      },
      {
        name: 'kaiten_remove_tag',
        description: 'Remove tag from card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            tagName: {
              type: 'string',
              description: 'Tag name'
            }
          },
          required: ['cardId', 'tagName']
        }
      },
      {
        name: 'kaiten_git_branch',
        description: 'Create git branch for card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_git_checkout',
        description: 'Checkout git branch for card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_git_commit',
        description: 'Commit changes with card reference',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            message: {
              type: 'string',
              description: 'Commit message (optional)'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_git_status',
        description: 'Get git status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'kaiten_git_push',
        description: 'Push git branch for card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_users',
        description: 'Get list of users',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'kaiten_search_users',
        description: 'Search users by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'kaiten_get_checklists',
        description: 'Get checklists from a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_create_checklist',
        description: 'Create a checklist on a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            name: {
              type: 'string',
              description: 'Checklist name'
            }
          },
          required: ['cardId', 'name']
        }
      },
      {
        name: 'kaiten_toggle_checklist_item',
        description: 'Check or uncheck a checklist item',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            checklistId: {
              type: 'number',
              description: 'Checklist ID'
            },
            itemId: {
              type: 'number',
              description: 'Checklist item ID'
            },
            checked: {
              type: 'boolean',
              description: 'Set to true to check, false to uncheck'
            }
          },
          required: ['cardId', 'checklistId', 'itemId', 'checked']
        }
      },
      {
        name: 'kaiten_add_checklist_item',
        description: 'Add an item to a checklist',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            checklistId: {
              type: 'number',
              description: 'Checklist ID'
            },
            text: {
              type: 'string',
              description: 'Item text'
            }
          },
          required: ['cardId', 'checklistId', 'text']
        }
      },
      {
        name: 'kaiten_delete_checklist_item',
        description: 'Delete an item from a checklist',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            checklistId: {
              type: 'number',
              description: 'Checklist ID'
            },
            itemId: {
              type: 'number',
              description: 'Item ID to delete'
            }
          },
          required: ['cardId', 'checklistId', 'itemId']
        }
      },
      {
        name: 'kaiten_get_files',
        description: 'Get list of files attached to a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_download_file',
        description: 'Download a single file from a card to temp directory',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            fileId: {
              type: 'number',
              description: 'File ID to download'
            },
            outputDir: {
              type: 'string',
              description: 'Output directory (optional, defaults to /tmp/kaiten/{cardId}/)'
            }
          },
          required: ['cardId', 'fileId']
        }
      },
      {
        name: 'kaiten_download_all_files',
        description: 'Download all files from a card to temp directory',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'number',
              description: 'Card ID'
            },
            outputDir: {
              type: 'string',
              description: 'Output directory (optional, defaults to /tmp/kaiten/{cardId}/)'
            }
          },
          required: ['cardId']
        }
      },
      {
        name: 'kaiten_clean_temp',
        description: 'Clean temporary directory for Kaiten files',
        inputSchema: {
          type: 'object',
          properties: {
            dir: {
              type: 'string',
              description: 'Directory to clean (optional, /tmp/kaiten/{cardId}/ if cardId in dir path, otherwise /tmp/kaiten/)'
            }
          }
        }
      }
    ];
  }

  async handleToolCall(toolName, args) {
    debugLog(`Tool called: ${toolName}`, args);
    try {
      switch (toolName) {
        case 'kaiten_spaces':
          return await sdk.getSpaces();

        case 'kaiten_boards':
          return await sdk.getBoards(args.spaceId);

        case 'kaiten_columns':
          return await sdk.getColumns(args.boardId);

        case 'kaiten_cards':
          return await sdk.getCards(args.spaceId, args.boardId);

        case 'kaiten_card':
          return await sdk.getCard(args.cardId, args.simple || true);

        case 'kaiten_create_card':
          return await sdk.createCard({
            title: args.title,
            boardId: args.boardId,
            columnId: args.columnId,
            description: args.description
          });

        case 'kaiten_update_card':
          return await sdk.updateCard(args.cardId, JSON.parse(args.data));

        case 'kaiten_delete_card':
          return await sdk.deleteCard(args.cardId);

        case 'kaiten_move_card':
          return await sdk.moveToColumn(args.cardId, args.columnId);

        case 'kaiten_assign_card':
          return await sdk.assignTo(args.cardId, args.userId);

        case 'kaiten_find_cards':
          const findCards = await sdk.getCards(null, args.boardId);
          const findFiltered = findCards.filter(c => 
            c.tags?.some(t => t.name === args.tagName)
          );
          return findFiltered.map(c => ({
            id: c.id,
            title: c.title,
            board_id: c.board_id,
            column_id: c.column_id,
            tags: c.tags
          }));

        case 'kaiten_add_comment':
          return await sdk.addComment(args.cardId, args.text);

        case 'kaiten_get_comments':
          return await sdk.getComments(args.cardId);

        case 'kaiten_create_child_card':
          return await sdk.createSubtask(args.parentId, args.title);

        case 'kaiten_get_child_cards':
          return await sdk.getSubtasks(args.cardId, true);

        case 'kaiten_get_all_child_cards':
          return await sdk.getAllSubtasks(args.cardId, true);

        case 'kaiten_get_parent':
          return await sdk.getParent(args.cardId, true);

        case 'kaiten_attach_to_parent':
          return await sdk.attachToParent(args.cardId, args.parentId, args.position);

        case 'kaiten_detach_from_parent':
          return await sdk.detachFromParent(args.cardId);

        case 'kaiten_add_tag':
          return await sdk.addTag(args.cardId, args.tagName);

        case 'kaiten_remove_tag':
          return await sdk.removeTag(args.cardId, args.tagName);

        case 'kaiten_git_branch':
          return await sdk.createGitBranch(args.cardId);

        case 'kaiten_git_checkout':
          return await sdk.checkoutGitBranch(args.cardId);

        case 'kaiten_git_commit':
          return await sdk.commitGit(args.cardId, args.message);

        case 'kaiten_git_status':
          return await sdk.getGitStatus();

        case 'kaiten_git_push':
          return await sdk.gitPush(args.cardId);

        case 'kaiten_users':
          return await sdk.getUsers();

        case 'kaiten_search_users':
          return await sdk.findUser(args.query);

        case 'kaiten_get_checklists':
          return await sdk.getChecklists(args.cardId);

        case 'kaiten_create_checklist':
          return await sdk.createChecklist(args.cardId, args.name);

        case 'kaiten_toggle_checklist_item':
          return await sdk.toggleChecklistItem(args.cardId, args.checklistId, args.itemId, args.checked);

        case 'kaiten_add_checklist_item':
          return await sdk.addChecklistItem(args.cardId, args.checklistId, args.text);

        case 'kaiten_delete_checklist_item':
          return await sdk.deleteChecklistItem(args.cardId, args.checklistId, args.itemId);

        case 'kaiten_get_files':
          return await sdk.getCardFiles(args.cardId);

        case 'kaiten_download_file':
          return await sdk.downloadFileToDisk(args.cardId, args.fileId, args.outputDir);

        case 'kaiten_download_all_files':
          return await sdk.downloadAllCardFiles(args.cardId, args.outputDir);

        case 'kaiten_clean_temp':
          let cardId = null;
          if (args.dir && args.dir.match(/\/kaiten\/(\d+)/)) {
            cardId = parseInt(args.dir.match(/\/kaiten\/(\d+)/)[1]);
          }
          return { deleted: await sdk.cleanTempDir(cardId) };

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      // Include detailed error information for axios errors
      if (error.cause && error.cause.response) {
        const { status, data } = error.cause.response;
        let errorMsg = `Tool ${toolName} failed: ${error.message} (HTTP ${status})`;
        if (data) {
          errorMsg += ` - ${JSON.stringify(data)}`;
        }
        errorLog('Tool error:', { toolName, message: error.message, httpStatus: status, responseData: data });
        throw new Error(errorMsg);
      }
      errorLog('Tool error:', { toolName, message: error.message });
      throw new Error(`Tool ${toolName} failed: ${error.message}`);
    }
  }

  sendResponse(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  async handleMessage(message) {
    try {
      if (message.method === 'initialize') {
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'kaiten-mcp',
              version: '2.0.0'
            }
          }
        });
      } else if (message.method === 'tools/list') {
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: this.tools
          }
        });
      } else if (message.method === 'tools/call') {
        const result = await this.handleToolCall(
          message.params.name,
          message.params.arguments || {}
        );
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          }
        });
      } else if (message.method === 'shutdown') {
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: null
        });
        process.exit(0);
      }
    } catch (error) {
      this.sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error.message
        }
      });
    }
  }

  start() {
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error.message);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse final message:', error.message);
        }
      }
    });
  }
}

const server = new MCPServer();
server.start();
