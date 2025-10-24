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
  const [demos] = useState<Demo[]>(mockDemos);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Azure AI Showcase Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Azure AI Service と AI Foundry を活用したデモのショーケース
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* フィルター */}
        <DemoFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearFilters={handleClearFilters}
        />

        {/* デモ件数表示 */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredDemos.length} 件のデモを表示中
          </p>
        </div>

        {/* デモグリッド */}
        {filteredDemos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemos.map((demo) => (
              <DemoCard key={demo.id} demo={demo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              選択した条件に一致するデモがありません
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              フィルターをクリア
            </button>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            © 2025 Azure AI Showcase Demo. Built with React + Vite + Tailwind CSS.
          </p>
        </div>
      </footer>
    </div>
  );
};
