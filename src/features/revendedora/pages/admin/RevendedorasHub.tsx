import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Percent, Palette, Store } from "lucide-react";
import AdminBranding from "./Branding";
import AdminResellers from "./Resellers";
import CommissionConfiguration from "./CommissionConfiguration";
import PersonalizarLoja from "@/features/store/pages/PersonalizarLoja";

export default function RevendedorasHub() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Revendedoras</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Personalize sua plataforma, gerencie revendedoras e configure comissões
                </p>
            </div>

            <Tabs defaultValue="personalizacao" className="w-full">
                <TabsList>
                    <TabsTrigger value="personalizacao" className="gap-2" data-testid="tab-personalizacao">
                        <Palette className="h-4 w-4" />
                        Personalização
                    </TabsTrigger>
                    <TabsTrigger value="loja" className="gap-2" data-testid="tab-loja">
                        <Store className="h-4 w-4" />
                        Loja
                    </TabsTrigger>
                    <TabsTrigger value="revendedoras" className="gap-2" data-testid="tab-revendedoras">
                        <Users className="h-4 w-4" />
                        Revendedoras
                    </TabsTrigger>
                    <TabsTrigger value="comissoes" className="gap-2" data-testid="tab-comissoes">
                        <Percent className="h-4 w-4" />
                        Configurar Comissões
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="personalizacao" className="mt-4">
                    <AdminBranding />
                </TabsContent>

                <TabsContent value="loja" className="mt-4">
                    <PersonalizarLoja />
                </TabsContent>

                <TabsContent value="revendedoras" className="mt-4">
                    <AdminResellers />
                </TabsContent>

                <TabsContent value="comissoes" className="mt-4">
                    <CommissionConfiguration />
                </TabsContent>
            </Tabs>
        </div>
    );
}
