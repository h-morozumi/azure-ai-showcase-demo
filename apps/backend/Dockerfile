# syntax=docker/dockerfile:1.7-labs
FROM python:3.13-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    UV_PROJECT=apps/backend \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

# 依存関係インストール用のビルドステージ
FROM base AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# uv をインストールし、ロックファイルに基づいて依存関係を解決
RUN pip install --no-cache-dir uv

# pyproject とロックファイルのみコピーして依存関係の解決を行う
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --compile-bytecode --no-install-project

# ソースコードをコピー
FROM base AS runner

RUN adduser --disabled-password --gecos "" appuser
USER appuser

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# プロジェクトファイルをコピー
COPY . .

# uvicorn で FastAPI アプリを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

EXPOSE 8000
