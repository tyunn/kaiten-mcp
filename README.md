# Kaiten MCP

MCP Server и CLI-инструмент для работы с Kaiten API с оптимизацией токенов.

## 📑 Содержание

- [Установка](#-установка)
- [Конфигурация](#-конфигурация)
- [Использование](#-использование)
- [Оптимизация токенов](#--оптимизация-токенов)
- [Все доступные команды](#-все-доступные-команды)
- [Для AI помощников](#-для-ai-помощников)
- [Troubleshooting](#--troubleshooting)
- [Инструкции для AI](#-инструкции-для-ai)

## Установка

```bash
git clone https://github.com/tyunn/kaiten-mcp.git
cd kaiten-mcp
```

## Конфигурация

### Настройки проекта (опционально)
### Обязательные настройки

Создайте глобальный конфиг с настройками доступа:

```bash
mkdir -p ~/.kaiten
cat > ~/.kaiten/config << EOF
KAITEN_API_URL=https://ваш-домен.kaiten.ru/api/latest
KAITEN_API_TOKEN=ваш_api_токен
EOF
```

**Как получить данные:**
- **API URL**: это адрес вашего пространства Kaiten (например: https://company.kaiten.ru/api/latest)
- **API Token**: зайдите в настройки профиля в Kaiten → "API токены" → создайте новый токен

**Важно:** Этот файл содержит секретные данные (токен доступа) и **НЕ должен коммититься в git**.


Создайте файл `.kaiten.env` в директории вашего проекта для бизнес логики проекта:

```bash
# Скопируйте пример и отредактируйте под ваш проект
cp .kaiten.config.example .kaiten.env
```

**Пример содержимого `.kaiten.env`:**
```env
# Kaiten project configuration

# Пространство по умолчанию
# Все операции с карточками будут использовать это пространство
KAITEN_DEFAULT_SPACE_ID=12345

# Доска по умолчанию
# Все операции создания карточек будут использовать эту доску
KAITEN_DEFAULT_BOARD_ID=67890

# Временная директория для скачивания файлов
# Файлы сохраняются в /tmp/kaiten/{cardId}/ по умолчанию
KAITEN_TEMP_DIR=/tmp/kaiten
```

**Параметры ограничения доступа (опционально):**
```env
# Список разрешённых пространств (через запятую)
# Полезно для команд которые работают с несколькими проектами
KAITEN_ALLOWED_SPACE_IDS=12345,67890

# Список разрешённых досок (через запятую)
# Полезно для ограничения доступа к конкретным доскам
KAITEN_ALLOWED_BOARD_IDS=111,222,333
```

**Уровень логирования (опционально):**
```env
# Уровень логирования для MCP сервера
# error - только ошибки
# warn - предупреждения и ошибки
# info - информационные сообщения (по умолчанию)
# debug - все сообщения включая детальные данные запросов/ответов
KAITEN_LOG_LEVEL=info
```
### Порядок загрузки конфигурации

SDK ищет конфигурацию в следующем приоритете:

1. **`~/.kaiten/config`** (глобальная) ← загружается первой
2. **`.kaiten.env`** (проектная) ← загружается второй
3. **`.env`** (fallback) ← загружается третьей, только если нет KAITEN_API_URL

**Важно:**
- Глобальные настройки (`~/.kaiten/config`) обязательны
- Проектные настройки (`.kaiten.env`) используются для Space ID и Board ID
- **Параметр `cwd` в MCP config определяет директорию проекта для поиска `.kaiten.env`**
- Board ID можно узнать через команду `npm start board`
- Ограничения работают на уровне SDK и защищают от случайного доступа к другим пространствам/доскам

## Использование

### Через MCP server (AI assistants)

Команды доступны для AI ассистентов через MCP server. AI может вызывать их напрямую без префикса `kaiten`.

### Команды CLI (для локального использования)

```bash
# Поиск задач (оптимизировано для токенов)
npm start find agent-safe                           # ~30 байт
npm start find agent-safe -m                         # ~81 байт (JSON)
npm start find agent-safe --board="Название доски"  # Фильтр по доске

# Детали задач
npm start card-simple <id>                           # ~200 байт
npm start card <id>                                  # Полный JSON

# CRUD операций
npm start create '{"title":"Задача","boardId":123,"columnId":456}'
npm start update <id> '{"title":"Новое название"}'
npm start delete <id>
npm start move <id> <column_id>
npm start assign <id> <user_id>

# Подзадачи и комментарии
npm start subtask create <parent_id> <title>
npm start comment add <card_id> <text>

# Метки
npm start tag add <card_id> <tag_name>
npm start tag filter <tag_name> -m

# Навигация
npm start board                 # Список досок
npm start column <board_id>      # Список колонок
npm start user [query]           # Поиск пользователя

# Справка
npm start help
```

### Глобальное использование CLI (опционально)

```bash
npm install -g .
```

После этого можно использовать команды без `npm start`:

```bash
kaiten find agent-safe
kaiten card-simple 12345
```

### Использование SDK в проектах

```javascript
import { createSDK } from 'kaiten-cli';

const sdk = createSDK();

// Получить карточку
const card = await sdk.getCard(12345);

// Создать карточку
const newCard = await sdk.createCard({
  title: 'Новая задача',
  boardId: 123,
  columnId: 456,
  tags: ['agent-safe']
});

// Создать подзадачи
await sdk.createTaskFlow(parentCardId, [
  { title: 'Подзадача 1', description: '...' },
  { title: 'Подзадача 2', description: '...' }
]);

// Переместить карточку
await sdk.moveToColumn(cardId, columnId);

// Добавить комментарий
await sdk.addComment(cardId, 'Текст комментария');

// Проверить метки
if (sdk.hasTag(card, 'agent-safe')) {
  // Работаем с задачей
}

// Поиск по меткам
const agentSafeCards = await sdk.getCardsWithTag('agent-safe');
```

## 🎯 Оптимизация токенов

### Сравнение команд:

| Команда | Размер (байт) | Использование |
|---------|---------------|---------------|
| `kaiten find agent-safe` | **30** | Поиск задач для агента |
| `kaiten find agent-safe -m` | **81** | Поиск с JSON |
| `kaiten card-simple <id>` | **200** | Детали задачи |
| `kaiten tag filter agent-safe` | **100** | Поиск по метке |
| `kaiten simple` | 2924 | ❌ Все задачи |
| `kaiten cards` | 5958 | ❌ Все задачи JSON |

### Рекомендации для работы с Claude:

**Оптимальный workflow:**
```bash
kaiten find agent-safe                  # Найти задачи для агента (~30 байт)
kaiten card-simple <id>                # Детали конкретной задачи (~200 байт)
```

**Избегать:** `kaiten cards` и `kaiten simple` - они загружают все задачи (~3000-6000 байт)

### Что оптимизировано:
- Удалены base64 аватары
- Убраны избыточные метаданные
- Оптимизированы форматы дат и времени (YYYY-MM-DD)
- Сокращены описания до 500 символов
- Минимальный JSON с короткими ключами (`i`, `t`, `c`, `tg`)

## Все доступные команды

### Карточки

### Карточки
| Команда | Описание |
|---------|----------|
| `find <tag> [-m] [--board=<id>]` | Быстрый поиск по метке (~30 байт) |
| `card-simple <id>` | Детали задачи (человекочитаемый) |
| `card <id>` | Детали задачи (JSON) |
| `cards` | Список задач (JSON) |
| `simple` | Список задач (человекочитаемый) |
| `create '<json>'` | Создать карточку |
| `update <id> '<json>'` | Обновить карточку |
| `delete <id>` | Удалить карточку |
| `move <id> <column_id> [lane_id]` | Переместить карточку |
| `assign <id> <user_id>` | Назначить исполнителя |

### Git интеграция
| Команда | Описание |
|---------|----------|
| `git-branch <card_id>` | Создать ветку для задачи (feature/<id>-<title>) |
| `git-checkout <card_id>` | Переключиться на ветку задачи |
| `git-commit <card_id> [msg]` | Закоммитить (msg по умолчанию: "Work in progress") |
| `git-status` | Показать статус git |
| `git-push <card_id>` | Запушить ветку |

### Подзадачи и комментарии
| Команда | Описание |
|---------|----------|
| `subtask create <parent> <title>` | Создать подзадачу |
| `subtask list <parent>` | Список подзадач |
| `subtask attach <card> <parent>` | Привязать к родителю |
| `subtask detach <card>` | Отвязать от родителя |
| `comment add <card> <text>` | Добавить комментарий |
| `comment list <card>` | Список комментариев |

### Метки
| Команда | Описание |
|---------|----------|
| `tag add <id> <tag>` | Добавить метку |
| `tag remove <id> <tag>` | Удалить метку |
| `tag filter <tag> [-m]` | Фильтр по метке |
| `tag list` | Список карточек с метками |

### Навигация
| Команда | Описание |
|---------|----------|
| `spaces` | Список пространств |
| `board [space_id]` | Список досок |
| `column <board_id>` | Список колонок |
| `user [query]` | Найти пользователя |

### Файлы
| Команда | Описание |
|---------|----------|
| `kaiten_get_files <card_id>` | Список файлов карточки |
| `kaiten_download_file <card_id> <file_id> [dir]` | Скачать файл в временную директорию |
| `kaiten_download_all_files <card_id> [dir]` | Скачать все файлы карточки |
| `kaiten_clean_temp [dir]` | Очистить временную директорию |

Файлы сохраняются в `/tmp/kaiten/{cardId}/` по умолчанию. Директорию можно изменить через параметр `dir` или переменную окружения `KAITEN_TEMP_DIR`.


### Флаги
| Флаг | Описание |
|-------|----------|
| `-m, --minimal` | Минимальный JSON (без отступов, короткие ключи) |
| `--board=<id|name>` | Фильтр по доске (ID или название) |

## Git интеграция (опционально)

```bash
npm start git-branch <card_id>             # Создать ветку для задачи
npm start git-checkout <card_id>           # Переключиться на ветку задачи
npm start git-commit <card_id> [msg]       # Закоммитить изменения
npm start git-status                       # Показать статус git
npm start git-push <card_id>                # Запушить ветку
```

## Использование SDK в проектах (опционально)

```javascript
import { createSDK } from 'kaiten-cli';

const sdk = createSDK();

// Получить карточку
const card = await sdk.getCard(12345);

// Создать карточку
const newCard = await sdk.createCard({
  title: 'Новая задача',
  boardId: 123,
  columnId: 456,
  tags: ['agent-safe']
});

// Создать подзадачи
await sdk.createTaskFlow(parentCardId, [
  { title: 'Подзадача 1', description: '...' },
  { title: 'Подзадача 2', description: '...' }
]);

// Переместить карточку
await sdk.moveToColumn(cardId, columnId);

// Добавить комментарий
await sdk.addComment(cardId, 'Текст комментария');

// Проверить метки
if (sdk.hasTag(card, 'agent-safe')) {
  // Работаем с задачей
}

// Поиск по меткам
const agentSafeCards = await sdk.getCardsWithTag('agent-safe');
```

## Архитектура

### Структура

```
src/
├── sdk.js              # Высокоуровневый SDK
├── api/
│   ├── cards.js      # CRUD карточек
│   ├── subtasks.js   # Подзадачи
│   ├── comments.js   # Комментарии
│   ├── columns.js    # Доски и колонки
│   ├── users.js      # Пользователи
│   ├── client.js     # HTTP клиент (axios)
│   └── index.js      # Экспорт API
└── utils/
    ├── config.js     # Загрузка конфигурации
    └── temp.js      # Управление временной директорией для файлов
```

### Конфигурация (приоритет):

1. **`~/.kaiten/config`** - глобальные настройки (API URL, токен)
2. **`.kaiten.env`** - проектные настройки (Space ID, Board ID)
3. **`.env`** (fallback) - для обратной совместимости

## Для AI помощников

### Настройка MCP server

Добавьте сервер Kaiten MCP в конфигурацию вашего AI-ассистента.

#### Для Claude Code (терминал)

Используйте команду `claude mcp add` для добавления сервера:

```bash
# Глобально (для всех проектов)
claude mcp add kaiten /путь/к/kaiten-mcp/start-mcp.sh

# Или локально для конкретного проекта
claude mcp add kaiten /путь/к/kaiten-mcp/start-mcp.sh -s local
```

**Проверка:**
```bash
claude mcp list
```

Вывод должен показать:
```
Checking MCP server health...
kaiten: /путь/к/kaiten-mcp/start-mcp.sh - ✓ Connected
```

**Важно:** После добавления MCP сервера перезапустите сессию Claude Code, чтобы инструменты стали доступны.

#### Для других AI-ассистентов

**Claude Desktop:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Cursor:**
- Проектный: `<ваш-проект>/.cursor/mcp.json`
- Глобальный: `~/.cursor/mcp.json`

**Continue.dev:**
- Проектный: `<ваш-проект>/.continue/config.json`
- Глобальный: `~/.continue/config.json`

#### Настройка проекта

В директории вашего проекта создайте файл конфигурации Kaiten:

**Файл `.kaiten.env` в корне проекта:**
```env
# Kaiten project configuration
KAITEN_DEFAULT_SPACE_ID=12345
KAITEN_DEFAULT_BOARD_ID=67890

# Опционально: ограничение доступа для безопасности
KAITEN_ALLOWED_SPACE_IDS=12345
KAITEN_ALLOWED_BOARD_IDS=67890
```

**Глобальный файл `~/.kaiten/config`:**
```env
# Обязательные параметры
KAITEN_API_URL=https://ваш-домен.kaiten.ru/api/latest
KAITEN_API_TOKEN=ваш_api_токен
```

#### Важные моменты

- Параметр `cwd` в конфигурации MCP определяет директорию проекта для поиска `.kaiten.env`
- Без `cwd` будут использоваться только глобальные настройки из `~/.kaiten/config`
- Параметры доступа (`KAITEN_ALLOWED_*`) работают только если указаны в `.kaiten.env` проекта

### Инструкции для AI assistants

В каждом проекте создайте файл `CLAUDE.md` в корневой директории для инструкций AI (Claude Code, Cursor и др.).

Добавьте в `CLAUDE.md` вашего проекта:

### Настройка MCP server

Добавьте в конфигурацию Claude Code:

```json
{
  "mcpServers": {
    "kaiten": {
      "command": "/путь/к/kaiten-mcp/start-mcp.sh"
    }
  }
}
```

## 🔧 Troubleshooting

### MCP инструменты не доступны

**Симптом:** Вы добавили MCP сервер, но AI не видит инструменты `kaiten_*`.

**Решения:**

1. **Проверьте конфигурацию:**
   ```bash
   claude mcp list
   ```
   
   Должен показать статус `✓ Connected`.

2. **Перезапустите Claude Code:**
   - После добавления MCP сервера закройте и откройте Claude Code
   - Или перезапустите терминальную сессию

3. **Используйте правильную команду добавления:**
   ```bash
   # Для Claude Code в терминале
   claude mcp add kaiten /путь/к/kaiten-mcp/start-mcp.sh
   
   # Проверьте список
   claude mcp list
   ```

4. **Удалите старые конфигурации:**
   Если раньше использовали `.claude/settings.json`, удалите его:
   ```bash
   rm .claude/settings.json
   claude mcp add kaiten /путь/к/start-mcp.sh
   ```

### Ошибка "No MCP servers configured"

**Симптом:** Команда `claude mcp list` показывает "No MCP servers configured".

**Решение:**
```bash
# Добавьте сервер снова
claude mcp add kaiten /путь/к/kaiten-mcp/start-mcp.sh

# Проверьте результат
claude mcp list
```

### MCP сервер не запускается

**Симптом:** Статус показывает "✗ Connection failed".

**Проверки:**

1. **Права доступа:**
   ```bash
   chmod +x /путь/к/kaiten-mcp/start-mcp.sh
   ```

2. **Путь к Node.js:**
   ```bash
   which node
   # Должен показать путь к node
   ```

3. **Тест ручного запуска:**
   ```bash
   /путь/к/kaiten-mcp/start-mcp.sh
   # Должен запуститься без ошибок
   ```

### Конфигурация не загружается

**Симптом:** SDK не видит настройки из `.kaiten.env`.

**Решение:**

1. **Проверьте наличие файла:**
   ```bash
   ls -la .kaiten.env
   ```

2. **Проверьте приоритет загрузки:**
   SDK ищет конфигурацию в таком порядке:
   1. `~/.kaiten/config` (глобальная)
   2. `.kaiten.env` (проектная)
   3. `.env` (fallback)

3. **Тест загрузки:**
   ```bash
   node -e "
   import { getConfig } from '/путь/к/kaiten-mcp/src/utils/config.js';
   const config = getConfig();
   console.log('API URL:', config.apiUrl ? '✓' : '✗');
   console.log('API Token:', config.apiToken ? '✓' : '✗');
   console.log('Space ID:', config.defaultSpaceId);
   console.log('Board ID:', config.defaultBoardId);
   "
   ```

### Альтернатива: Прямое использование SDK

Если MCP не работает, можно использовать SDK напрямую:

```bash
node -e "
import { createSDK } from '/путь/к/kaiten-mcp/src/sdk.js';
const sdk = createSDK();
sdk.getCardsWithTag('agent-safe').then(cards => {
  console.log('Найдено:', cards.length, 'карточек');
  console.log(JSON.stringify(cards, null, 2));
}).catch(err => console.error('Ошибка:', err.message));
"
```

**Преимущества прямого использования SDK:**
- Работает без MCP интеграции
- Полный доступ ко всем функциям
- Легко тестировать и отлаживать

**Недостатки:**
- Не интегрирован с AI ассистентами
- Требует Node.js
- Нет автоматической документации инструментов

## Инструкции для AI

В каждом проекте создайте файл `CLAUDE.md` в корневой директории для инструкций AI (Claude Code, Cursor и др.).

Добавьте в `CLAUDE.md` вашего проекта:

```markdown
## Работа с Kaiten

Когда я прошу посмотреть карточки, тикеты или задачи в Kaiten - используй MCP инструменты напрямую.

**Важно**: Перед началом работы проверяй метки карточки. Работай только с задачами, у которых есть метка `agent-safe`. Если у задачи есть метка `human-review-required` - не мерь её автоматически, требуй ручного просмотра.

**Минимизация токенов**: Используй фильтрацию по меткам вместо получения всех задач.

### Доступные MCP инструменты

**Поиск карточек:**
- `kaiten_find_cards` с параметром `tagName: "agent-safe"` - Найти карточки по метке
- `kaiten_card` с параметром `cardId: <id>, simple: true` - Детали карточки (человекочитаемый)
- `kaiten_card` с параметром `cardId: <id>` - Детали карточки (JSON)

**Навигация:**
- `kaiten_spaces` - Список пространств
- `kaiten_boards` с параметром `spaceId: <id>` - Список досок
- `kaiten_columns` с параметром `boardId: <id>` - Список колонок

**CRUD операции:**
- `kaiten_create_card` с параметрами `title, boardId, columnId, [description], [laneId]` - Создать карточку. **Рекомендуется указывать `laneId`**, иначе карточка попадёт на дефолтную lane доски.
- `kaiten_update_card` с параметрами `cardId, data` - Обновить карточку
- `kaiten_delete_card` с параметром `cardId` - Удалить карточку
- `kaiten_move_card` с параметрами `cardId, columnId, [laneId]` - Переместить карточку
- `kaiten_assign_card` с параметрами `cardId, userId` - Назначить исполнителя

**Дочерние карточки и комментарии:**
- `kaiten_create_child_card` с параметрами `parentId, title` - Создать дочернюю карточку
- `kaiten_get_child_cards` с параметром `cardId` - Список дочерних карточек
- `kaiten_get_all_child_cards` с параметром `cardId` - Список всех дочерних карточек (включая вложенные)
- `kaiten_get_parent` с параметром `cardId` - Получить родительскую карточку
- `kaiten_attach_to_parent` с параметрами `cardId, parentId, position` - Привязать карточку к родителю
- `kaiten_detach_from_parent` с параметром `cardId` - Отвязать карточку от родителя
- `kaiten_add_comment` с параметрами `cardId, text` - Добавить комментарий
- `kaiten_get_comments` с параметром `cardId` - Список комментариев

**Метки:**
- `kaiten_add_tag` с параметрами `cardId, tagName` - Добавить метку
- `kaiten_remove_tag` с параметрами `cardId, tagName` - Удалить метку

**Файлы:**
- `kaiten_get_files` с параметром `cardId` - Список файлов карточки
- `kaiten_download_file` с параметрами `cardId, fileId, [dir]` - Скачать файл в временную директорию
- `kaiten_download_all_files` с параметром `cardId, [dir]` - Скачать все файлы карточки
- `kaiten_clean_temp` с параметром `[dir]` - Очистить временную директорию

**Git интеграция:**
- `kaiten_git_branch` с параметром `cardId` - Создать ветку для задачи
- `kaiten_git_checkout` с параметром `cardId` - Переключиться на ветку задачи
- `kaiten_git_commit` с параметрами `cardId, message` - Закоммитить изменения
- `kaiten_git_status` - Показать статус git
- `kaiten_git_push` с параметром `cardId` - Запушить ветку

### Оптимальный workflow

```javascript
// 1. Найти задачи для агента
kaiten_find_cards({ tagName: "agent-safe" })

// 2. Создать ветку для задачи
kaiten_git_branch({ cardId: 12345 })

// 3. Внести изменения и закоммитить
// ...работа над кодом...
kaiten_git_commit({ cardId: 12345, message: "Начал работу" })

// 4. Проверить статус
kaiten_git_status({})

// 5. Запушить
kaiten_git_push({ cardId: 12345 })
```

**Избегай**: `kaiten_cards` без параметров - он загружает все задачи (~3000-6000 байт)
```

### Пример для других AI

Для Cursor, Copilot или других AI можно использовать те же инструкции - формат совместим.

## Лицензия

MIT

