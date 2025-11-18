export default function GlobalLoading() {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="h-1 w-full overflow-hidden bg-purple-100">
        <div className="h-full w-1/2 animate-[loading-bar_1s_ease-in-out_infinite] bg-gradient-to-r from-purple-500 via-pink-400 to-amber-400" />
      </div>
    </div>
  );
}
