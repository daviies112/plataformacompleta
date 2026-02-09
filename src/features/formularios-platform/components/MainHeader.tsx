import { Link, useLocation } from "wouter";
import { Sparkles, MessageCircle, FileText } from "lucide-react";

export function MainHeader() {
  const [location] = useLocation();
  
  const isFormulario = location.startsWith('/formulario') || location === '/';
  const isWhatsApp = location.startsWith('/whatsapp');
  
  return (
    <header className="h-16 border-b border-border/50 glass backdrop-blur-xl sticky top-0 z-50 animate-slide-up">
      <div className="container mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Formulário Premium
          </h1>
        </div>
        
        <nav className="flex items-center gap-2">
          <Link href="/formulario">
            <button className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all cursor-pointer
              ${isFormulario 
                ? 'bg-gradient-to-r from-primary to-primary-glow text-white shadow-glow' 
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              }
            `}>
              <FileText className="h-4 w-4" />
              Formulário
            </button>
          </Link>
          
          <Link href="/whatsapp">
            <button className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all cursor-pointer
              ${isWhatsApp 
                ? 'bg-gradient-to-r from-primary to-primary-glow text-white shadow-glow' 
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              }
            `}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
