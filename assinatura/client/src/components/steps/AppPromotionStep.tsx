import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Trophy, TrendingUp, Smartphone, ArrowRight, CheckCircle2 } from "lucide-react";
import { useContract } from "@/contexts/ContractContext";
import jewelryApp from "@assets/stock_images/luxury_jewelry_store_e7290e08.jpg";
import financialApp from "@assets/stock_images/professional_busines_a0c2523c.jpg";
import trophyApp from "@assets/stock_images/golden_trophy_award__62627ba6.jpg";

export const AppPromotionStep = () => {
  const { setCurrentStep, contractData } = useContract();
  
  // As URLs virão do contexto do contrato que foi carregado do banco
  const googlePlayUrl = contractData?.google_play_url || 'https://play.google.com/store';
  const appStoreUrl = contractData?.app_store_url || 'https://www.apple.com/app-store/';

  const features = [
    {
      icon: <ShoppingBag className="w-8 h-8 text-amber-600" />,
      title: "Sua Boutique Digital Exclusive",
      description: "Transforme seu smartphone em uma vitrine de alto luxo. Acesse nosso catálogo completo de semijoias premium com design exclusivo e qualidade impecável.",
      image: jewelryApp,
      points: ["Catálogo em tempo real", "Preços exclusivos de revenda", "Fotos profissionais para compartilhar"]
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-emerald-600" />,
      title: "Gestão de Alta Performance",
      description: "Tenha o controle total do seu império. Acompanhe lucros, datas de recebimento e histórico de vendas com transparência absoluta e relatórios detalhados.",
      image: financialApp,
      points: ["Previsão de ganhos", "Controle de estoque", "Relatórios financeiros diários"]
    },
    {
      icon: <Trophy className="w-8 h-8 text-amber-500" />,
      title: "Clube de Elite & Reconhecimento",
      description: "Você não é apenas uma revendedora, é parte de um ecossistema de sucesso. Participe de rankings nacionais, ganhe viagens, bônus e prêmios de luxo.",
      image: trophyApp,
      points: ["Rankings de performance", "Metas com prêmios reais", "Comunidade VIP de suporte"]
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* Header Elegante */}
        <div className="text-center space-y-10 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-5 bg-amber-50 rounded-full mb-2 border border-amber-100 shadow-sm">
              <Smartphone className="w-10 h-10 text-amber-700" />
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-medium text-neutral-900 tracking-tight leading-[1.1]">
              Ative seu Negócio <br />
              <span className="italic text-amber-700 underline decoration-amber-200 underline-offset-8">Baixe o Aplicativo</span>
            </h1>
            <p className="text-2xl text-neutral-500 font-light leading-relaxed max-w-2xl mx-auto">
              Seu contrato foi assinado! Agora, o passo final e obrigatório para ativar sua loja e receber sua maleta é baixar nosso aplicativo oficial.
            </p>
          </div>

          {/* Botões de Download no Topo - Máximo Destaque */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
            <Button 
              className="bg-black text-white hover:bg-neutral-800 h-24 px-12 rounded-[2rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-2 active:scale-95 w-full sm:w-auto border-2 border-neutral-800"
              onClick={() => window.open(googlePlayUrl, '_blank')}
            >
              <div className="text-left">
                <div className="text-xs uppercase font-black tracking-[0.2em] text-neutral-500 mb-1">Disponível no</div>
                <div className="text-3xl font-bold">Google Play</div>
              </div>
            </Button>
            <Button 
              className="bg-black text-white hover:bg-neutral-800 h-24 px-12 rounded-[2rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-2 active:scale-95 w-full sm:w-auto border-2 border-neutral-800"
              onClick={() => window.open(appStoreUrl, '_blank')}
            >
              <div className="text-left">
                <div className="text-xs uppercase font-black tracking-[0.2em] text-neutral-500 mb-1">Disponível na</div>
                <div className="text-3xl font-bold">App Store</div>
              </div>
            </Button>
          </div>
          
          <div className="pt-4">
            <p className="text-amber-600 font-medium flex items-center justify-center gap-2 animate-pulse">
              <ArrowRight className="w-5 h-5 rotate-90" />
              Arraste para ver o que te espera no app
              <ArrowRight className="w-5 h-5 rotate-90" />
            </p>
          </div>
        </div>

        {/* Features Premium Layout */}
        <div className="space-y-32">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`flex flex-col lg:items-center gap-12 lg:gap-20 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              {/* Imagem com Efeito Elegante */}
              <div className="flex-1 group">
                <div className="relative overflow-hidden rounded-3xl shadow-2xl transition-all duration-700 group-hover:scale-[1.02]">
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-[400px] object-cover filter brightness-95 group-hover:brightness-100 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                </div>
              </div>

              {/* Texto e Detalhes */}
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100">
                      {feature.icon}
                    </div>
                    <h3 className="text-3xl font-serif font-medium text-neutral-900">{feature.title}</h3>
                  </div>
                  <p className="text-lg text-neutral-500 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>

                <ul className="space-y-3">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-center gap-3 text-neutral-700 font-light">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Download Section Estilo Banner Premium */}
        <div className="relative overflow-hidden bg-neutral-900 rounded-[3rem] p-12 md:p-20 text-white text-center shadow-2xl mt-24">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
          
          <div className="relative z-10 space-y-10 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-serif font-medium leading-tight">Prepare-se para o Brilho</h2>
              <p className="text-neutral-400 font-light text-lg">
                Baixe agora o seu centro de comando e comece a faturar hoje mesmo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                variant="outline"
                className="bg-white text-black hover:bg-neutral-100 h-20 px-10 rounded-2xl flex items-center gap-4 border-none shadow-xl transition-transform hover:-translate-y-1"
                onClick={() => window.open(googlePlayUrl, '_blank')}
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Download via</div>
                  <div className="text-2xl font-bold">Google Play</div>
                </div>
              </Button>
              <Button 
                variant="outline"
                className="bg-white text-black hover:bg-neutral-100 h-20 px-10 rounded-2xl flex items-center gap-4 border-none shadow-xl transition-transform hover:-translate-y-1"
                onClick={() => window.open(appStoreUrl, '_blank')}
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Download via</div>
                  <div className="text-2xl font-bold">App Store</div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Minimalista */}
        <div className="text-center py-10">
          <Button 
            variant="ghost" 
            className="text-neutral-400 hover:text-amber-700 transition-colors flex items-center gap-2 mx-auto font-light tracking-wide"
            onClick={() => setCurrentStep(5)}
          >
            Acessar painel web <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};
