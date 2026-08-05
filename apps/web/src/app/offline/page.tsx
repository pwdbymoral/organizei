export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Você está sem conexão</h1>
      <p className="text-text-muted mt-3">
        Reconecte-se para acessar informações atualizadas. Nenhum dado financeiro é exibido offline.
      </p>
    </main>
  );
}
