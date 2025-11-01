import { useState, useMemo } from 'react';
import { DemoCard } from '../components/DemoCard';
import { DemoFilter } from '../components/DemoFilter';
import { mockDemos } from '../utils/mockData';
import type { AzureService, Demo } from '../types/demo';

/**
 * トップページ - デモショーケース一覧
 */
export const TopPage: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<AzureService[]>([]);
  const demos = useMemo<Demo[]>(() => mockDemos, []);

  // すべてのタグを抽出（重複を除く）
  const allTags = useMemo(() => {
    const tags = new Set<AzureService>();
    demos.forEach((demo) => {
      demo.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [demos]);

  // フィルタリングされたデモ
  const filteredDemos = useMemo(() => {
    if (selectedTags.length === 0) {
      return demos;
    }
    return demos.filter((demo) =>
      selectedTags.some((tag) => demo.tags.includes(tag))
    );
  }, [selectedTags, demos]);

  // タグの切り替え
  const handleTagToggle = (tag: AzureService) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  // フィルターのクリア
  const handleClearFilters = () => {
    setSelectedTags([]);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-cyan-500/30 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-[32rem] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-500/20 blur-[160px]" />
        <div className="absolute -bottom-20 left-[-10%] h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[140px]" />
      </div>

      {/* ヒーローセクション */}
      <header className="relative z-10 border-b border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 sm:px-8 lg:px-12 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Azure AI Showcase
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Azure の AI ポテンシャル
              </span>
              を体験する
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Azure AI Service と AI Foundry の最新デモを、洗練されたビジュアルで探索しましょう。ユースケースやサービス別にフィルタリングし、求めているソリューションを素早く発見できます。
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#demos"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-xl hover:shadow-cyan-500/40"
              >
                デモ一覧へ進む
                <span aria-hidden="true">→</span>
              </a>
              <span className="text-sm text-slate-400">
                {demos.length} 件のデモが登録されています
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur">
              <div className="absolute inset-x-6 -top-24 h-32 rounded-full bg-gradient-to-r from-cyan-400/60 via-sky-500/40 to-blue-500/40 blur-[60px]" aria-hidden="true" />
              <div className="relative space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
                  Key capabilities
                </p>
                <ul className="space-y-3 text-sm text-slate-200">
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">1</span>
                    音声・テキスト・画像を跨いだマルチモーダル分析
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">2</span>
                    Azure OpenAI と AI Foundry の連携による高度な生成AI
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">3</span>
                    Speech Service を活用したリアルタイム音声ソリューション
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main
        id="demos"
        className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-12 sm:px-8 lg:px-12"
      >
        {/* フィルター */}
        <DemoFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearFilters={handleClearFilters}
        />

        {/* デモ件数表示 */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
              {filteredDemos.length}
            </span>
            件のデモが見つかりました
          </p>
          <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
            curated experiences
          </span>
        </div>

        {/* デモグリッド */}
        {filteredDemos.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredDemos.map((demo) => (
              <DemoCard key={demo.id} demo={demo} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-16 text-center shadow-xl shadow-cyan-500/10">
            <p className="text-lg text-slate-200">
              選択した条件に一致するデモがありません
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
            >
              フィルターをリセット
              <span aria-hidden="true">↺</span>
            </button>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 py-10 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs uppercase tracking-[0.35em] text-slate-500 sm:px-8 lg:px-12">
          © 2025 Azure AI Showcase Demo — Crafted with React, Vite & Tailwind CSS
        </div>
      </footer>
    </div>
  );
};
