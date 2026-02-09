import { useState } from 'react';
import type { ChartType } from '@/types/notion';
import type { StoreDatabase } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart, PieChart, AreaChart } from 'lucide-react';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ChartViewProps {
  database: StoreDatabase;
  onUpdate: (updates: Partial<StoreDatabase>) => void;
  isLocked: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f', '#ffbb28', '#ff6b6b'];

export const ChartView = ({ database, onUpdate, isLocked }: ChartViewProps) => {
  const [chartType, setChartType] = useState<ChartType>(database.chartType || 'bar');
  const [xAxisField, setXAxisField] = useState(database.chartXAxis || database.fields[0]?.id || '');
  const [yAxisField, setYAxisField] = useState(database.chartYAxis || database.fields.find(f => f.type === 'number')?.id || database.fields[1]?.id || '');

  const chartTypes: { type: ChartType; icon: any; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Barras' },
    { type: 'line', icon: LineChart, label: 'Linha' },
    { type: 'pie', icon: PieChart, label: 'Pizza' },
    { type: 'area', icon: AreaChart, label: 'Área' },
    { type: 'donut', icon: PieChart, label: 'Rosca' },
  ];

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    onUpdate({ chartType: type });
  };

  const handleXAxisChange = (fieldId: string) => {
    setXAxisField(fieldId);
    onUpdate({ chartXAxis: fieldId });
  };

  const handleYAxisChange = (fieldId: string) => {
    setYAxisField(fieldId);
    onUpdate({ chartYAxis: fieldId });
  };

  const getChartData = () => {
    const xField = database.fields.find(f => f.id === xAxisField);
    const yField = database.fields.find(f => f.id === yAxisField);

    if (!xField || !yField) return [];

    return (database.rows || []).map(row => ({
      name: String(row.values[xAxisField] || 'Sem nome'),
      value: Number(row.values[yAxisField]) || 0,
      fullData: row.values,
    }));
  };

  const chartData = getChartData();
  const hasData = chartData.length > 0 && chartData.some(d => d.value !== 0);

  if (database.fields.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Adicione campos ao database para criar gráficos
      </div>
    );
  }

  const renderChart = () => {
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado disponível para visualizar</p>
            <p className="text-sm mt-2">Adicione linhas com valores numéricos ao database</p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name={database.fields.find(f => f.id === yAxisField)?.name || 'Valor'} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name={database.fields.find(f => f.id === yAxisField)?.name || 'Valor'} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsAreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" name={database.fields.find(f => f.id === yAxisField)?.name || 'Valor'} />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={chartType === 'donut' ? 120 : 150}
                innerRadius={chartType === 'donut' ? 60 : 0}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex gap-2">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant={chartType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleChartTypeChange(type)}
              disabled={isLocked}
              title={label}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Eixo X:</span>
            <Select value={xAxisField} onValueChange={handleXAxisChange} disabled={isLocked}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {database.fields.map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(chartType === 'bar' || chartType === 'line' || chartType === 'area') && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Eixo Y:</span>
              <Select value={yAxisField} onValueChange={handleYAxisChange} disabled={isLocked}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {database.fields.map(field => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        {renderChart()}
      </div>

      {hasData && (
        <div className="text-sm text-muted-foreground text-center">
          Mostrando {chartData.length} {chartData.length === 1 ? 'registro' : 'registros'}
        </div>
      )}
    </div>
  );
};
