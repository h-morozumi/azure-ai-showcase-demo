import type { Demo } from '../types/demo';

interface DemoCardProps {
  demo: Demo;
}

/**
 * デモのタイルカードコンポーネント
 */
export const DemoCard: React.FC<DemoCardProps> = ({ demo }) => {
  return (
    <a
      href={demo.path}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:shadow-2xl hover:shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
      aria-label={`${demo.title} の詳細へ移動`}
    >
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={demo.image}
          alt={demo.title}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110 group-hover:rotate-1 transform-gpu"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-5 text-xs uppercase tracking-[0.3em] text-slate-200 opacity-0 transition duration-500 group-hover:opacity-100">
          <span className="text-cyan-200">{demo.tags?.[0] ?? 'No Tag'}</span>
          <span aria-hidden="true">Explore →</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="text-xl font-semibold text-white">
          {demo.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-300">
          {demo.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {demo.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};
