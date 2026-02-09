import { useState } from "react";
import { FormConfig, Question } from "../types/form";
import { QuestionEditor } from "./QuestionEditor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Plus, Eye } from "lucide-react";
import { Textarea } from "./ui/textarea";

interface FormBuilderProps {
  onPreview: (config: FormConfig) => void;
}

export const FormBuilder = ({ onPreview }: FormBuilderProps) => {
  const [title, setTitle] = useState("Formulário de Qualificação");
  const [description, setDescription] = useState("Responda as perguntas abaixo para verificar se você está qualificado para uma reunião com nosso time.");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: 'Qual é o faturamento anual da sua empresa?',
      type: 'multiple-choice',
      options: [
        { id: '1-1', text: 'Menos de R$ 100.000', points: 0 },
        { id: '1-2', text: 'R$ 100.000 - R$ 500.000', points: 5 },
        { id: '1-3', text: 'R$ 500.000 - R$ 1.000.000', points: 10 },
        { id: '1-4', text: 'Acima de R$ 1.000.000', points: 15 }
      ]
    }
  ]);
  const [passingScore, setPassingScore] = useState(20);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'multiple-choice',
      options: [
        { id: '1', text: '', points: 0 },
        { id: '2', text: '', points: 0 }
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updated: Question) => {
    setQuestions(questions.map(q => q.id === id ? updated : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handlePreview = () => {
    const config: FormConfig = {
      title,
      description,
      questions,
      passingScore
    };
    onPreview(config);
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-[var(--shadow-luxury)]">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Título do Formulário
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold bg-background border-border"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Pontuação Mínima para Aprovação
            </label>
            <Input
              type="number"
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              className="w-32 bg-background border-border"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            onUpdate={(updated) => updateQuestion(question.id, updated)}
            onDelete={() => deleteQuestion(question.id)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={addQuestion}
          variant="outline"
          className="gap-2 border-border"
        >
          <Plus className="h-4 w-4" />
          Adicionar Pergunta
        </Button>
        
        <Button
          onClick={handlePreview}
          variant="premium"
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Visualizar Formulário
        </Button>
      </div>
    </div>
  );
};
