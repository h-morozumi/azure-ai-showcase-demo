import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RealtimeConfigurator } from '../components/RealtimeConfigurator';

export const SpeechAvatarDemoPage: React.FC = () => {
  const navigate = useNavigate();

  // デモ詳細へ遷移した直後にスクロール位置をトップへ戻す
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleBackToDemos = useCallback(() => {
    navigate('/', { state: { scrollTo: 'demos', scrollTrigger: Date.now() } });
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),_transparent_60%)]" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 sm:px-10 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Realtime Conversation Avatar
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              Azure Speech Service の Voice Live API と アバターで
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                没入型のリアルタイム会話体験
              </span>
              を実現
            </h1>
            <p className="text-lg text-slate-300">
              このデモでは、Voice Live API の低遅延ストリーミングとテキスト読み上げアバターを組み合わせ、自然な表情と音声で応答するバーチャルアシスタント体験を提供します。Azure OpenAI と連携することで、対話の文脈理解と応答生成を強化します。
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleBackToDemos}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
              >
                ← デモ一覧へ戻る
              </button>
              <a
                href="#experience"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-xl hover:shadow-cyan-500/40"
              >
                体験フローを見る
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
              <div className="absolute inset-x-6 -top-16 h-24 rounded-full bg-gradient-to-r from-cyan-400/50 via-sky-400/40 to-indigo-500/40 blur-[60px]" aria-hidden="true" />
              <div className="relative space-y-4 text-sm text-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Realtime Stack</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">1</span>
                    Voice Live API による双方向音声ストリーミングと低遅延制御
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">2</span>
                    テキスト読み上げアバターの表情・口パク同期レンダリング
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">3</span>
                    Azure OpenAI による会話文脈理解と応答生成
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16 sm:px-10" id="experience">
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">デモ体験の流れ</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            アバターに話しかけると音声入力が即座に解析され、感情に合わせたボイスとアニメーションでリアクションします。低遅延応答とリップシンクにより、対面しているかのような体験を実現します。
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
              <h3 className="text-lg font-semibold text-white">ユーザーの声を解析</h3>
              <p className="mt-3 text-sm text-slate-300">
                マイク入力を Voice Live API にストリーミングし、音声認識と音響特徴量をリアルタイムで取得します。発話スタイルから意図・感情を抽出し、Azure OpenAI に渡します。
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
              <h3 className="text-lg font-semibold text-white">アバターが自然に応答</h3>
              <p className="mt-3 text-sm text-slate-300">
                応答文はテキスト読み上げアバターに送られ、口パク同期と視線制御を伴うアニメーションを生成します。Voice Live API のストリームを通じて音声を返却し、ほぼリアルタイムで再生します。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-cyan-500/10">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">アーキテクチャ ハイライト</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <dl className="space-y-4 text-sm text-slate-200">
              <div>
                <dt className="font-semibold text-white">リアルタイムパイプライン</dt>
                <dd className="mt-1 text-slate-300">WebRTC/WS を通じて音声・メタデータを双方向ストリーミング。バックエンドでは Azure Functions もしくは Container Apps でセッション管理を行います。</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">コンテンツ生成</dt>
                <dd className="mt-1 text-slate-300">Azure OpenAI で会話文脈を保持しながらレスポンス文を生成し、Speech Service へ最適な音声スタイルで送信します。</dd>
              </div>
            </dl>
            <dl className="space-y-4 text-sm text-slate-200">
              <div>
                <dt className="font-semibold text-white">アバター表現</dt>
                <dd className="mt-1 text-slate-300">テキスト読み上げアバターのモーションテンプレートを活用し、口形状と感情表現を時間軸で同期します。</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">監視と分析</dt>
                <dd className="mt-1 text-slate-300">Application Insights と Azure Monitor を活用し、ストリーム遅延・エラー・利用状況を追跡します。</dd>
              </div>
            </dl>
          </div>
        </section>

  <RealtimeConfigurator />

  <section className="rounded-3xl border border-dashed border-cyan-400/40 bg-cyan-400/5 p-8 text-slate-100">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">次のステップ</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-200">
            <li>• 音声入力・応答を可視化するダッシュボードを追加</li>
            <li>• セッション管理とアバター状態を統合したバックエンド API を実装</li>
            <li>• Microsoft Entra ID と連携した認可フローを導入</li>
          </ul>
          <button
            type="button"
            onClick={handleBackToDemos}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            ← トップに戻る
          </button>
        </section>
      </main>
    </div>
  );
};
