#!/bin/sh
# 启动本机后端并打开页面：  sh backend/run.sh
cd "$(dirname "$0")" || exit 1
if [ ! -x .venv/bin/uvicorn ]; then
  python3 -m venv .venv && .venv/bin/pip install -q --upgrade pip && .venv/bin/pip install -q -r requirements.txt || exit 1
fi
( sleep 2; (command -v open >/dev/null && open http://127.0.0.1:8765/) || (command -v xdg-open >/dev/null && xdg-open http://127.0.0.1:8765/) ) &
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "${QZ_PORT:-8765}"
