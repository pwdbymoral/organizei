export default function DashboardLoading() {
  return <LoadingShell title="Carregando sua visão geral…" />;
}

function LoadingShell({ title }: { title: string }) {
  return (
    <main className="bg-background min-h-screen p-4 sm:p-8" aria-busy="true" aria-label={title}>
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="bg-surface h-8 w-40 animate-pulse rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-surface h-64 animate-pulse rounded-3xl" />
          <div className="bg-surface h-64 animate-pulse rounded-3xl" />
        </div>
        <div className="bg-surface h-80 animate-pulse rounded-3xl" />
      </div>
    </main>
  );
}
