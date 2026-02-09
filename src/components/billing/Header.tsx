export default function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
            Gestão Financeira
          </h1>
          <p className="text-xl text-muted-foreground/80 mt-2">
            Conecte seus bancos de forma segura e gerencie todas as suas contas e transações em um só lugar
          </p>
        </div>
      </div>
    </header>
  );
}
