import type { FormElement } from "../types/form";
import { QuestionEditor } from "./QuestionEditor";
import { HeadingEditor } from "./HeadingEditor";
import { TextEditor } from "./TextEditor";
import { PageBreakEditor } from "./PageBreakEditor";
import {
  isQuestionElement,
  isHeadingElement,
  isTextElement,
  isPageBreakElement,
  elementToQuestion,
  questionToElement,
  type Question
} from "../types/form";

interface ElementCardProps {
  element: FormElement;
  index: number;
  onUpdate: (updated: FormElement) => void;
  onDelete: () => void;
}

export const ElementCard = ({ element, index, onUpdate, onDelete }: ElementCardProps) => {
  if (isQuestionElement(element)) {
    const legacyQuestion = elementToQuestion(element);
    
    return (
      <QuestionEditor
        question={legacyQuestion}
        index={index}
        onUpdate={(updatedQuestion: Question) => {
          const updatedElement = questionToElement(updatedQuestion);
          onUpdate(updatedElement);
        }}
        onDelete={onDelete}
      />
    );
  }

  if (isHeadingElement(element)) {
    return (
      <HeadingEditor
        element={element}
        index={index}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  if (isTextElement(element)) {
    return (
      <TextEditor
        element={element}
        index={index}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  if (isPageBreakElement(element)) {
    return (
      <PageBreakEditor
        element={element}
        index={index}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  return null;
};
