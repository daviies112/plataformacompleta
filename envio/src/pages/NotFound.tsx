import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <span className="text-4xl font-bold text-muted-foreground">404</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild>
          <Link to="/">
            Voltar para a Início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
