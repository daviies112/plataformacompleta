import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Plus, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const stats = [
    {
      title: "Total Leads",
      value: 0,
      description: "Neste mês",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Agendamentos",
      value: 0,
      description: "Próximos 7 dias",
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: "Formulários",
      value: 0,
      description: "Ativos",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Conversões",
      value: "0%",
      description: "Este mês",
      icon: Zap,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao ExecutiveAI Pro. Aqui está o resumo de hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/formulario">
            <Button variant="default" className="gap-2">
              <Plus className="h-4 w-4" /> Novo Formulário
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Ver Agenda
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
