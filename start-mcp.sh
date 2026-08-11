#!/bin/bash
cd /home/anton/projects/github.com/tyunn/kaiten-mcp
# stdout — канал протокола MCP (только JSON-RPC, клиент читает его);
# stderr — логи сервера, уходят в файл и НЕ попадают в поток клиента.
LOG_DIR="$HOME/.kaiten/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/mcp-server-$(date +%Y%m%d-%H%M%S).log"
node mcp-server.js 2>>"$LOG_FILE" | tee -a "$LOG_FILE"
