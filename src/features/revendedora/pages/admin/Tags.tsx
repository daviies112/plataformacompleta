import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";

export function AdminTags() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Etiquetas</h1>
                <p className="text-muted-foreground">Gerencie as etiquetas do sistema</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        <CardTitle>Gestão de Etiquetas</CardTitle>
                    </div>
                    <CardDescription>
                        Aqui você poderá criar e gerenciar as etiquetas utilizadas no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Funcionalidade em desenvolvimento...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
