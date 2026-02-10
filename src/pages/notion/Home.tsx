import { Home as HomeIcon, TrendingUp, Users } from 'lucide-react';

const Home = () => {
  return (
    <div className="px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground tracking-tight gradient-text">
            Workspace Colaborativo
          </h1>
          <p className="text-xl text-muted-foreground/80 mt-2">
            Organize seus projetos e aumente sua produtividade
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border border-border rounded-lg">
            <HomeIcon className="w-10 h-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Seus Quadros</h3>
            <p className="text-muted-foreground">
              Acesse e gerencie todos os seus quadros em um só lugar
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg">
            <TrendingUp className="w-10 h-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Produtividade</h3>
            <p className="text-muted-foreground">
              Aumente sua eficiência com ferramentas de organização visual
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg">
            <Users className="w-10 h-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Colaboração</h3>
            <p className="text-muted-foreground">
              Trabalhe em equipe e compartilhe seus projetos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
