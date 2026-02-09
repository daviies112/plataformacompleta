import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Trophy, TrendingUp, Smartphone, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useContract } from "@/contexts/ContractContext";
import { useQuery } from "@tanstack/react-query";

// Import jewelry images
import boutiqueImage from "@assets/generated_images/elegant_semi-jewelry_boutique_display.png";
import analyticsImage from "@assets/generated_images/jewelry_with_business_analytics.png";
import trophyImage from "@assets/generated_images/trophy_with_luxury_jewelry.png";

interface AppPromotionConfig {
  app_store_url: string;
  google_play_url: string;
}

interface AppPromotionStepProps {
  button_color?: string;
  button_text_color?: string;
  icon_color?: string;
  title_color?: string;
  text_color?: string;
  background_color?: string;
}

export const AppPromotionStep = ({
  button_color = '#000000',
  button_text_color = '#ffffff',
  icon_color = '#d97706',
  title_color = '#171717',
  text_color = '#525252',
  background_color = '#fafafa'
}: AppPromotionStepProps) => {
  const { setCurrentStep, contractData } = useContract();
  
  // Fetch app promotion URLs from API (public endpoint - no auth required)
  const { data: appPromotionConfig, isLoading } = useQuery<AppPromotionConfig>({
    queryKey: ['/api/assinatura/public/app-promotion'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // Use API URLs first, fallback to contractData, then to defaults
  const googlePlayUrl = appPromotionConfig?.google_play_url || 
    (contractData as any)?.google_play_url || 
    'https://play.google.com/store';
  const appStoreUrl = appPromotionConfig?.app_store_url || 
    (contractData as any)?.app_store_url || 
    'https://www.apple.com/app-store/';

  const features = [
    {
      icon: <ShoppingBag className="w-8 h-8" style={{ color: icon_color }} />,
      title: "Sua Boutique Digital Exclusive",
      description: "Transforme seu smartphone em uma vitrine de alto luxo. Acesse nosso catálogo completo de semijoias premium com design exclusivo e qualidade impecável.",
      points: ["Catálogo em tempo real", "Preços exclusivos de revenda", "Fotos profissionais para compartilhar"],
      image: boutiqueImage
    },
    {
      icon: <TrendingUp className="w-8 h-8" style={{ color: icon_color }} />,
      title: "Gestão de Alta Performance",
      description: "Tenha o controle total do seu império. Acompanhe lucros, datas de recebimento e histórico de vendas com transparência absoluta e relatórios detalhados.",
      points: ["Previsão de ganhos", "Controle de estoque", "Relatórios financeiros diários"],
      image: analyticsImage
    },
    {
      icon: <Trophy className="w-8 h-8" style={{ color: icon_color }} />,
      title: "Clube de Elite & Reconhecimento",
      description: "Você não é apenas uma revendedora, é parte de um ecossistema de sucesso. Participe de rankings nacionais, ganhe viagens, bônus e prêmios de luxo.",
      points: ["Rankings de performance", "Metas com prêmios reais", "Comunidade VIP de suporte"],
      image: trophyImage
    }
  ];

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: background_color, selectionColor: button_color }}>
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8 space-y-20">
        
        <div className="text-center space-y-10 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-5 rounded-full mb-2 shadow-sm" style={{ backgroundColor: `${button_color}1A`, borderColor: `${button_color}33`, borderWidth: 1, borderStyle: 'solid' }}>
              <Smartphone className="w-10 h-10" style={{ color: icon_color }} />
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-medium tracking-tight leading-[1.1]" style={{ color: title_color }}>
              Ative seu Negócio <br />
              <span className="italic underline underline-offset-8" style={{ color: button_color, textDecorationColor: `${button_color}40` }}>Baixe o Aplicativo</span>
            </h1>
            <p className="text-2xl font-light leading-relaxed max-w-2xl mx-auto" style={{ color: text_color }}>
              Seu contrato foi assinado! Agora, o passo final e obrigatório para ativar sua loja e receber sua maleta é baixar nosso aplicativo oficial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
            <Button 
              className="h-24 px-12 rounded-[2rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-2 active:scale-95 w-full sm:w-auto border-2"
              style={{ backgroundColor: button_color, color: button_text_color, borderColor: button_color }}
              onClick={() => window.open(googlePlayUrl, '_blank')}
            >
              <div className="text-left">
                <div className="text-xs uppercase font-black tracking-[0.2em] mb-1" style={{ color: button_text_color, opacity: 0.7 }}>Disponível no</div>
                <div className="text-3xl font-bold" style={{ color: button_text_color }}>Google Play</div>
              </div>
            </Button>
            <Button 
              className="h-24 px-12 rounded-[2rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-2 active:scale-95 w-full sm:w-auto border-2"
              style={{ backgroundColor: button_color, color: button_text_color, borderColor: button_color }}
              onClick={() => window.open(appStoreUrl, '_blank')}
            >
              <div className="text-left">
                <div className="text-xs uppercase font-black tracking-[0.2em] mb-1" style={{ color: button_text_color, opacity: 0.7 }}>Disponível na</div>
                <div className="text-3xl font-bold" style={{ color: button_text_color }}>App Store</div>
              </div>
            </Button>
          </div>
          
          <div className="pt-4">
            <p className="font-medium flex items-center justify-center gap-2 animate-pulse" style={{ color: button_color }}>
              <ArrowRight className="w-5 h-5 rotate-90" />
              Arraste para ver o que te espera no app
              <ArrowRight className="w-5 h-5 rotate-90" />
            </p>
          </div>
        </div>

        <div className="space-y-32">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`flex flex-col lg:items-center gap-12 lg:gap-20 ${
                index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              <div className="flex-1 group">
                <div className="relative overflow-hidden rounded-3xl shadow-2xl transition-all duration-700 group-hover:scale-[1.02] h-[400px]">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-40"></div>
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100">
                      {feature.icon}
                    </div>
                    <h3 className="text-3xl font-serif font-medium" style={{ color: title_color }}>{feature.title}</h3>
                  </div>
                  <p className="text-lg leading-relaxed font-light" style={{ color: text_color }}>
                    {feature.description}
                  </p>
                </div>

                <ul className="space-y-3">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-center gap-3 font-light" style={{ color: text_color }}>
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: button_color }} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden bg-neutral-900 rounded-[3rem] p-12 md:p-20 text-white text-center shadow-2xl mt-24">
          <div className="absolute top-0 left-0 w-full h-full" style={{ background: `radial-gradient(circle at top right, ${button_color}33, transparent, transparent)` }}></div>
          
          <div className="relative z-10 space-y-10 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-serif font-medium leading-tight text-white">Prepare-se para o Brilho</h2>
              <p className="text-neutral-400 font-light text-lg">
                Baixe agora o seu centro de comando e comece a faturar hoje mesmo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                variant="outline"
                className="bg-white text-black h-20 px-10 rounded-2xl flex items-center gap-4 border-none shadow-xl transition-transform hover:-translate-y-1"
                onClick={() => window.open(googlePlayUrl, '_blank')}
              >
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Download via</div>
                  <div className="text-2xl font-bold">Google Play</div>
                </div>
              </Button>
              <Button 
                variant="outline"
                className="bg-white text-black h-20 px-10 rounded-2xl flex items-center gap-4 border-none shadow-xl transition-transform hover:-translate-y-1"
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

        <div className="text-center py-10">
          <Button 
            variant="ghost" 
            className="transition-colors flex items-center gap-2 mx-auto font-light tracking-wide"
            style={{ color: text_color, opacity: 0.7 }}
            onClick={() => setCurrentStep(5)}
          >
            Acessar painel web <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};
