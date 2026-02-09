import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MonthlyInvoice, formatMonthYear } from "@/lib/financialUtils";

interface MonthlySpendingBarChartProps {
  data: MonthlyInvoice[];
}

export default function MonthlySpendingBarChart({ data }: MonthlySpendingBarChartProps) {
  const chartData = data
    .slice(0, 6)
    .reverse()
    .map((invoice) => ({
      month: formatMonthYear(invoice.transactions[0]?.date || ""),
      total: invoice.total,
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="p-4 md:p-6 h-full flex flex-col">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Evolução Mensal de Gastos</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar 
            dataKey="total" 
            fill="hsl(var(--primary))" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
