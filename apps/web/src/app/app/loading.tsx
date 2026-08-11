import { Skeleton } from '../../components/ui/skeleton';

export default function DashboardLoading() {
  return <LoadingShell title="Carregando sua visão geral…" />;
}

function LoadingShell({ title }: { title: string }) {
  return (
    <main className="bg-background min-h-screen p-4 sm:p-8" aria-busy="true" aria-label={title}>
      <div className="mx-auto grid max-w-7xl gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </main>
  );
}
