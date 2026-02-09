import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ElementCard } from "../ElementCard";
import { FormElement } from "../../types/form";
import { GripVertical } from "lucide-react";

interface SortableElementItemProps {
  element: FormElement;
  index: number;
  onUpdate: (element: FormElement) => void;
  onDelete: () => void;
}

export const SortableElementItem = ({
  element,
  index,
  onUpdate,
  onDelete,
}: SortableElementItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`relative group ${isDragging ? 'z-50 opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-accent rounded touch-none"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <ElementCard
            element={element}
            index={index}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};
