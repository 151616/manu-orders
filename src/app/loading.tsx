export default function AppLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-black" />
        <p className="mt-4 text-base font-semibold text-black">Loading page...</p>
        <p className="mt-1 text-sm text-black/65">
          Please wait while we load the next screen.
        </p>
      </div>
    </div>
  );
}
