import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AudioDebugInfoProps {
  audioUrl?: string;
  message: any;
}

export function AudioDebugInfo({ audioUrl, message }: AudioDebugInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!audioUrl) return null;

  return (
    <Card className="p-3 mt-2 bg-yellow-50 border-yellow-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-yellow-800">
          🔍 Debug de Áudio
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <strong>URL:</strong>
            <div className="bg-white p-2 rounded mt-1 break-all font-mono text-[10px]">
              {audioUrl}
            </div>
          </div>
          
          <div>
            <strong>Comprimento da URL:</strong> {audioUrl.length} caracteres
          </div>
          
          <div>
            <strong>Começa com:</strong> {audioUrl.substring(0, 50)}...
          </div>
          
          <div>
            <strong>Estrutura da mensagem:</strong>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto text-[10px]">
              {JSON.stringify(message, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(audioUrl);
                alert('URL copiada!');
              }}
            >
              📋 Copiar URL
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(audioUrl, '_blank')}
            >
              🔗 Abrir em nova aba
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch(audioUrl, { method: 'HEAD' });
                  alert(`Status: ${response.status}\nHeaders: ${Array.from(response.headers.entries()).map(([k,v]) => `${k}: ${v}`).join('\n')}`);
                } catch (error) {
                  alert(`Erro ao testar URL: ${error}`);
                }
              }}
            >
              🧪 Testar URL
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
