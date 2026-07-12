export default function BoardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-24 rounded bg-neutral-800" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded border border-neutral-800 bg-neutral-900/50" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 rounded bg-neutral-800" />
            <div className="h-16 rounded border border-neutral-800 bg-neutral-900/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
