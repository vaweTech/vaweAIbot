export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="mt-4 text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-rose-700">{title}</h3>
      <p className="mt-1 text-sm text-rose-600">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessState({
  title = "Success",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <p className="font-medium">{title}</p>
      {description && <p className="mt-0.5 text-emerald-700">{description}</p>}
    </div>
  );
}
