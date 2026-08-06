type AppPageHeaderProps = {
  title: string;
  description: string;
  context?: string;
};

export function AppPageHeader({
  title,
  description,
  context = 'Finanças da família',
}: AppPageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-text-muted text-sm">Organizei</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-text-muted mt-2 max-w-2xl text-sm sm:text-base">{description}</p>
      </div>
      <p className="text-text-muted hidden text-sm sm:block">{context}</p>
    </header>
  );
}
