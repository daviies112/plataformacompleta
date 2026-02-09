import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Plus, MessageSquare, Heading1, FileText, Minus } from "lucide-react";
import type { FormElement } from "../types/form";

interface ElementToolbarProps {
  onAddElement: (element: FormElement) => void;
}

export const ElementToolbar = ({ onAddElement }: ElementToolbarProps) => {
  const createQuestionElement = (): FormElement => ({
    type: 'question',
    id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: '',
    questionType: 'multiple-choice',
    options: [
      { id: '1', text: '', points: 0 },
      { id: '2', text: '', points: 0 }
    ],
    required: true,
    elementTypeVersion: 1
  });

  const createHeadingElement = (): FormElement => ({
    type: 'heading',
    id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: 'Título da Seção',
    level: 2,
    style: {
      alignment: 'left',
      fontSize: '2xl',
      fontWeight: 'bold'
    },
    elementTypeVersion: 1
  });

  const createTextElement = (): FormElement => ({
    type: 'text',
    id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: 'Digite seu texto aqui...',
    style: {
      alignment: 'left',
      fontSize: 'base',
      padding: 'md'
    },
    elementTypeVersion: 1
  });

  const createPageBreakElement = (): FormElement => ({
    type: 'pageBreak',
    id: `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label: 'Adicionar nova página',
    showLine: true,
    style: {
      margin: 'lg'
    },
    elementTypeVersion: 1
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 glass border-2 border-primary/30 hover:border-primary shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Adicionar Elemento
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 glass border-2 border-primary/20 shadow-xl">
        <DropdownMenuLabel className="text-base font-semibold text-primary">
          Escolha o tipo de elemento
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onAddElement(createQuestionElement())}
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Pergunta</span>
            <span className="text-xs text-muted-foreground">
              Adicione uma pergunta com opções de resposta e pontuação
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => onAddElement(createHeadingElement())}
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <Heading1 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Título</span>
            <span className="text-xs text-muted-foreground">
              Adicione um título de seção para organizar seu formulário
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => onAddElement(createTextElement())}
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Texto Simples</span>
            <span className="text-xs text-muted-foreground">
              Adicione um bloco de texto ou instrução para os respondentes
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => onAddElement(createPageBreakElement())}
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <Minus className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Adicionar nova página</span>
            <span className="text-xs text-muted-foreground">
              Crie uma nova página para organizar seu formulário em etapas
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
