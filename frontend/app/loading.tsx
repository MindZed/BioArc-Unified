export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <svg className="w-12 h-12 animate-spin" style={{ animationDuration: '1.2s' }} viewBox="0 0 50 50">
            <circle
              cx="25" cy="25" r="20"
              fill="none"
              stroke="url(#pageLoaderGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="70 60"
            />
            <defs>
              <linearGradient id="pageLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] font-medium">Loading</p>
      </div>
    </div>
  );
}
