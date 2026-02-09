import { useState } from "react";
import { Question, QuestionOption } from "../types/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface QuestionEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  index: number;
  dragHandleProps?: any;
}

export const QuestionEditor = ({ question, onUpdate, onDelete, index, dragHandleProps }: QuestionEditorProps) => {
  const [text, setText] = useState(question.text);
  
  const handleTextChange = (value: string) => {
    setText(value);
    onUpdate({ ...question, text: value });
  };

  const handleTypeChange = (type: 'multiple-choice' | 'text') => {
    const updatedQuestion: Question = {
      ...question,
      type,
      options: type === 'multiple-choice' ? (question.options || [
        { id: '1', text: '', points: 0 },
        { id: '2', text: '', points: 0 }
      ]) : undefined,
      points: type === 'text' ? (question.points || 0) : undefined
    };
    onUpdate(updatedQuestion);
  };

  const addOption = () => {
    if (question.type === 'multiple-choice') {
      const newOptions = [
        ...(question.options || []),
        { id: Date.now().toString(), text: '', points: 0 }
      ];
      onUpdate({ ...question, options: newOptions });
    }
  };

  const updateOption = (optionId: string, field: keyof QuestionOption, value: string | number) => {
    if (question.options) {
      const newOptions = question.options.map(opt =>
        opt.id === optionId ? { ...opt, [field]: value } : opt
      );
      onUpdate({ ...question, options: newOptions });
    }
  };

  const deleteOption = (optionId: string) => {
    if (question.options) {
      const newOptions = question.options.filter(opt => opt.id !== optionId);
      onUpdate({ ...question, options: newOptions });
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-[var(--shadow-luxury)] transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start gap-4">
        <div className="mt-2 cursor-move" {...dragHandleProps}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
              #{index + 1}
            </span>
            <Input
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 font-medium bg-background border-border"
            />
          </div>

          <div className="flex gap-3">
            <Select value={question.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[200px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                <SelectItem value="text">Resposta Livre</SelectItem>
              </SelectContent>
            </Select>

            {question.type === 'text' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pontos:</span>
                <Input
                  type="number"
                  value={question.points || 0}
                  onChange={(e) => onUpdate({ ...question, points: parseInt(e.target.value) || 0 })}
                  className="w-20 bg-background border-border"
                />
              </div>
            )}
          </div>

          {question.type === 'multiple-choice' && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              {question.options?.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    placeholder="Texto da opção"
                    className="flex-1 bg-background border-border"
                  />
                  <Input
                    type="number"
                    value={option.points}
                    onChange={(e) => updateOption(option.id, 'points', parseInt(e.target.value) || 0)}
                    placeholder="Pts"
                    className="w-20 bg-background border-border"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteOption(option.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="gap-1 border-border"
              >
                <Plus className="h-4 w-4" />
                Adicionar Opção
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
