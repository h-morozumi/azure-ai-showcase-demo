# GitHub Copilot カスタムインストラクション

## プロジェクト概要

このプロジェクトは、Azure AI Service と AI Foundry を活用したデモショーケースアプリケーションです。フロントエンドとバックエンドで構成されるフルスタックアプリケーションとして開発されています。

## 技術スタック

### フロントエンド
- **フレームワーク**: React (TypeScript)
- **スタイリング**: Tailwind CSS
- **パッケージマネージャー**: pnpm
- **ビルドツール**: Vite

### バックエンド
- **フレームワーク**: FastAPI (Python)
- **パッケージマネージャー**: uv (Astral)
- **型チェック**: mypy
- **リンター/フォーマッター**: ruff

### Azure Services
- Azure AI Services (Speech Service, Document Intelligence)
- Azure OpenAI Service (GPT-4, GPT-3.5)
- Azure AI Foundry (LLM, Agent)

## コーディング規約

### 全般
- 日本語のコメントを使用する（必要に応じて英語も可）
- 変数名、関数名、クラス名は英語で記述
- セキュリティを最優先し、API キーや機密情報をコードに含めない
- 環境変数を使用して設定を管理

### フロントエンド（React + TypeScript）

#### ファイル構成
```
frontend/src/
├── components/      # 再利用可能なコンポーネント
├── pages/          # ページコンポーネント
├── services/       # API 呼び出しロジック
├── hooks/          # カスタムフック
├── utils/          # ユーティリティ関数
├── types/          # TypeScript 型定義
└── App.tsx         # ルートコンポーネント
```

#### コーディングスタイル
- **コンポーネント**: 関数コンポーネントを使用（React Hooks）
- **命名規則**: 
  - コンポーネント: PascalCase（例: `SpeechRecognition.tsx`）
  - フック: `use` プレフィックス（例: `useAzureSpeech`）
  - ユーティリティ: camelCase（例: `formatDate`）
- **import 順序**:
  1. React 関連
  2. 外部ライブラリ
  3. 内部コンポーネント
  4. ユーティリティ
  5. 型定義
  6. スタイル

#### TypeScript
- `any` 型の使用を避ける
- インターフェースまたは型エイリアスで型を明示的に定義
- null/undefined チェックを適切に行う
- Optional Chaining (`?.`) を活用

#### Tailwind CSS
- ユーティリティクラスを優先
- カスタムクラスは必要最小限に
- レスポンシブデザインを考慮（`sm:`, `md:`, `lg:` などのプレフィックス）
- ダークモード対応を考慮（`dark:` プレフィックス）

#### 例: React コンポーネント
```typescript
import { useState, useEffect } from 'react';
import { SpeechService } from '@/services/speechService';
import type { SpeechResult } from '@/types/speech';

interface SpeechRecognitionProps {
  onResult: (result: SpeechResult) => void;
}

export const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ onResult }) => {
  const [isRecording, setIsRecording] = useState(false);
  
  const handleStart = async () => {
    setIsRecording(true);
    // 実装
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <button
        onClick={handleStart}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        {isRecording ? '録音中...' : '録音開始'}
      </button>
    </div>
  );
};
```

### バックエンド（FastAPI + Python）

#### ファイル構成
```
backend/app/
├── routers/         # API エンドポイント
├── services/        # ビジネスロジック
├── models/          # Pydantic モデル
├── utils/           # ユーティリティ関数
├── config.py        # 設定管理
└── main.py          # アプリケーションエントリポイント
```

#### コーディングスタイル
- **命名規則**:
  - ファイル: snake_case（例: `speech_service.py`）
  - クラス: PascalCase（例: `SpeechService`）
  - 関数/変数: snake_case（例: `recognize_speech`）
  - 定数: UPPER_SNAKE_CASE（例: `API_VERSION`）
- **型ヒント**: 必ず型ヒントを付与
- **docstring**: 関数やクラスには docstring を記述（Google スタイル推奨）
- **エラーハンドリング**: 適切な例外処理と HTTPException の使用

#### FastAPI
- Pydantic モデルでリクエスト/レスポンスを定義
- 依存性注入（Depends）を活用
- async/await を使用した非同期処理
- API バージョニングを考慮（例: `/api/v1/`）

#### 例: FastAPI エンドポイント
```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.speech_service import SpeechService

router = APIRouter(prefix="/api/v1/speech", tags=["speech"])

class SpeechRequest(BaseModel):
    text: str
    language: str = "ja-JP"

class SpeechResponse(BaseModel):
    audio_url: str
    duration: float

@router.post("/synthesize", response_model=SpeechResponse)
async def synthesize_speech(
    request: SpeechRequest,
    service: SpeechService = Depends()
) -> SpeechResponse:
    """
    テキストを音声に変換する
    
    Args:
        request: 音声合成リクエスト
        service: Speech Service インスタンス
        
    Returns:
        SpeechResponse: 音声 URL と再生時間
        
    Raises:
        HTTPException: 音声合成に失敗した場合
    """
    try:
        result = await service.synthesize(request.text, request.language)
        return SpeechResponse(
            audio_url=result.audio_url,
            duration=result.duration
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Azure AI Service 統合

### 環境変数
以下の環境変数を `.env` ファイルで管理：

```env
# Speech Service
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

# Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_KEY=
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=

# OpenAI
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
```

### ベストプラクティス
- エラーハンドリングを適切に実装
- リトライロジックを実装（exponential backoff）
- レート制限を考慮
- ログを適切に記録
- タイムアウトを設定

## パッケージ管理

### フロントエンド（pnpm）
```bash
pnpm add <package>           # 依存関係を追加
pnpm add -D <package>        # 開発依存関係を追加
pnpm install                 # 依存関係をインストール
pnpm update                  # 依存関係を更新
```

### バックエンド（uv）
```bash
uv add <package>             # 依存関係を追加
uv add --dev <package>       # 開発依存関係を追加
uv sync                      # 依存関係を同期
uv lock                      # ロックファイルを更新
```

## テスト

### フロントエンド
- Testing Library を使用
- ユーザーの操作をシミュレートするテストを作成
- スナップショットテストは最小限に

### バックエンド
- pytest を使用
- ユニットテストと統合テストを作成
- モックを活用して外部依存を分離
- テストカバレッジ 80% 以上を目標

## Git コミット規約

### コミットメッセージ
```
<type>: <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor`: リファクタリング
- `test`: テストの追加や修正
- `chore`: ビルドプロセスやツールの変更

**例:**
```
feat: Speech Service による音声認識機能を追加

Azure Speech Service SDK を統合し、リアルタイム音声認識機能を実装しました。
フロントエンドでマイク入力を取得し、バックエンドで音声をテキストに変換します。
```

## コード生成時の注意点

### Copilot に期待すること
1. **型安全性**: TypeScript/Python の型システムを最大限活用
2. **セキュリティ**: 入力検証、認証、認可を適切に実装
3. **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージ
4. **パフォーマンス**: 非同期処理、キャッシング、最適化
5. **アクセシビリティ**: ARIA 属性、キーボード操作対応
6. **レスポンシブデザイン**: モバイルファーストアプローチ

### 避けるべきパターン
- ハードコードされた API キーや機密情報
- `any` 型の過度な使用
- グローバル変数の使用
- 過度に複雑なネストしたコンポーネント
- エラーを無視する処理（`try-except pass`）

## コードレビューチェックリスト

- [ ] 型ヒント/型定義が適切に付与されている
- [ ] エラーハンドリングが実装されている
- [ ] ログが適切に記録されている
- [ ] テストが追加されている
- [ ] ドキュメント/コメントが更新されている
- [ ] セキュリティ上の問題がない
- [ ] パフォーマンスへの影響が考慮されている
- [ ] アクセシビリティが考慮されている（フロントエンド）

## リソース

- [Azure AI Services Documentation](https://learn.microsoft.com/ja-jp/azure/ai-services/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [pnpm Documentation](https://pnpm.io/)
- [uv Documentation](https://docs.astral.sh/uv/)
