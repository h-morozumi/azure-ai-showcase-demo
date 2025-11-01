import { useState } from 'react';
import type { AzureService } from '../types/demo';

interface DemoFilterProps {
  allTags: AzureService[];
  selectedTags: AzureService[];
  onTagToggle: (tag: AzureService) => void;
  onClearFilters: () => void;
}

/**
 * デモをフィルタリングするコンポーネント
 */
export const DemoFilter: React.FC<DemoFilterProps> = ({
  allTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-cyan-500/10 backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-xl">フィルター</h2>
          <p className="mt-1 text-sm text-slate-300">
            Azure サービス別にショーケースを絞り込みましょう
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
          aria-label={isOpen ? 'フィルターを閉じる' : 'フィルターを開く'}
        >
          <span>{isOpen ? '閉じる' : '開く'}</span>
          <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  className={`group relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 text-white shadow-lg shadow-cyan-500/40'
                      : 'border-white/20 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/10'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-60" aria-hidden="true" />
                  {tag}
                </button>
              );
            })}
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-slate-300">
              <span>{selectedTags.length} 個のフィルターを適用中</span>
              <button
                onClick={onClearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
              >
                すべてクリア
                <span aria-hidden="true">↺</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
