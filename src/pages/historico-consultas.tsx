import { useState, useEffect } from "react";
import { HistoryTable } from "@/components/history-table";
import { ProcessDetailsModal } from "@/components/compliance/process-details-modal";
import { EmptyState } from "@/components/empty-state";
import type { DatacorpCheck } from "@shared/db-schema";
import { FileText } from "lucide-react";

export default function HistoricoConsultasPage() {
  const [checks, setChecks] = useState<DatacorpCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<DatacorpCheck | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/compliance/history`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar histórico");
      }

      const data = await response.json();
      setChecks(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (check: DatacorpCheck) => {
    setSelectedCheck(check);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Histórico de Consultas
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize todas as consultas de CPF realizadas
          </p>
        </div>

        {!isLoading && checks.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma consulta encontrada"
            description="Realize sua primeira consulta de CPF para ver o histórico aqui."
          />
        ) : (
          <HistoryTable 
            data={checks} 
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
          />
        )}

        <ProcessDetailsModal
          check={selectedCheck}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>
    </div>
  );
}
