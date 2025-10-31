# Azure AI Showcase Backend

FastAPI を利用するバックエンド サービスのひな型です。uv を想定したプロジェクト構成になっています。

## セットアップ

```pwsh
uv sync --group dev
uv run fastapi dev app/main.py
```

## 開発ポリシー
- 型ヒントと docstring を徹底する
- 日本語コメントで補足説明を付ける
- FastAPI のルーター構造は `app/routers` ディレクトリに分割して管理する想定
