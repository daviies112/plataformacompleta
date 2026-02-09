import { FormElement, groupElementsIntoPages, flattenPagesToElements, Page } from "../../types/form";
import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableElementItem } from "./SortableElementItem";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "../ui/accordion";
import { GripVertical, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragDropEditorProps {
  elements: FormElement[];
  onReorder: (elements: FormElement[]) => void;
  onUpdate: (id: string, element: FormElement) => void;
  onDelete: (id: string) => void;
  activePageId?: string | null;
  onActivePageChange?: (pageId: string) => void;
}

interface SortablePageProps {
  page: Page;
  isActive: boolean;
  onUpdate: (id: string, element: FormElement) => void;
  onDelete: (id: string) => void;
}

const SortablePage = ({ page, isActive, onUpdate, onDelete }: SortablePageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <AccordionItem value={page.id} className="border rounded-lg mb-2">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-2 hover:bg-accent rounded cursor-grab active:cursor-grabbing touch-none ml-2"
            aria-label="Arrastar página"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <AccordionTrigger className="flex-1 hover:no-underline py-4 pr-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-foreground">{page.label}</div>
                <div className="text-xs text-muted-foreground">
                  {page.elementCount === 0 ? 'Página vazia' : `${page.elementCount} elemento${page.elementCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          </AccordionTrigger>
        </div>
        
        <AccordionContent className="px-4 pb-4">
          {page.elements.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/10">
              <p className="text-muted-foreground text-sm">
                Página vazia. Adicione elementos abaixo.
              </p>
            </div>
          ) : (
            <SortableContext
              items={page.elements.map(el => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {page.elements.map((element, index) => (
                  <SortableElementItem
                    key={element.id}
                    element={element}
                    index={index}
                    onUpdate={(updated) => onUpdate(element.id, updated)}
                    onDelete={() => onDelete(element.id)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export const DragDropEditor = ({ 
  elements, 
  onReorder, 
  onUpdate, 
  onDelete,
  activePageId,
  onActivePageChange
}: DragDropEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  
  const pages = useMemo(() => groupElementsIntoPages(elements), [elements]);
  
  // Initialize active page to first page if not set
  useEffect(() => {
    if (!activePageId && pages.length > 0 && onActivePageChange) {
      onActivePageChange(pages[0].id);
    }
  }, []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    setActiveId(draggedId);
    
    // Check if dragging a page or an element
    const isPage = pages.some(p => p.id === draggedId);
    setIsDraggingPage(isPage);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      if (isDraggingPage) {
        // Reordering pages
        const oldIndex = pages.findIndex((p) => p.id === active.id);
        const newIndex = pages.findIndex((p) => p.id === over.id);
        const reorderedPages = arrayMove(pages, oldIndex, newIndex);
        const newElements = flattenPagesToElements(reorderedPages);
        onReorder(newElements);
      } else {
        // Reordering elements within a page
        // Find which page contains the active and over elements
        let activePageIndex = -1;
        let overPageIndex = -1;
        
        pages.forEach((page, index) => {
          if (page.elements.some(el => el.id === active.id)) {
            activePageIndex = index;
          }
          if (page.elements.some(el => el.id === over.id)) {
            overPageIndex = index;
          }
        });
        
        // Only reorder if both elements are in the same page
        if (activePageIndex !== -1 && activePageIndex === overPageIndex) {
          const targetPage = pages[activePageIndex];
          const oldIndex = targetPage.elements.findIndex((el) => el.id === active.id);
          const newIndex = targetPage.elements.findIndex((el) => el.id === over.id);
          
          // Create new pages array with reordered elements in target page
          const newPages = [...pages];
          newPages[activePageIndex] = {
            ...targetPage,
            elements: arrayMove(targetPage.elements, oldIndex, newIndex)
          };
          
          // Flatten and update
          const newElements = flattenPagesToElements(newPages);
          onReorder(newElements);
        }
      }
    }
    
    setActiveId(null);
    setIsDraggingPage(false);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDraggingPage(false);
  };

  const handleAccordionChange = (value: string) => {
    if (onActivePageChange) {
      onActivePageChange(value);
    }
  };

  // Show simple list if only one page and no page breaks
  const showAccordion = pages.length > 1 || elements.some(el => el.type === 'pageBreak');

  if (!showAccordion && pages.length === 1) {
    // Single page, no accordion needed
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={elements.map(el => el.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {elements.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/10">
                <p className="text-muted-foreground">
                  Nenhum elemento ainda. Clique nos botões abaixo para adicionar.
                </p>
              </div>
            ) : (
              elements.map((element, index) => (
                <SortableElementItem
                  key={element.id}
                  element={element}
                  index={index}
                  onUpdate={(updated) => onUpdate(element.id, updated)}
                  onDelete={() => onDelete(element.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId && (
            <div className="opacity-80 rotate-2 scale-105">
              <div className="bg-card border-2 border-primary shadow-2xl rounded-lg p-4">
                <div className="text-sm font-medium text-foreground">
                  Arrastando elemento...
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-2">
        {pages.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">
              Nenhum elemento ainda. Clique nos botões abaixo para adicionar.
            </p>
          </div>
        ) : (
          <Accordion 
            type="single" 
            collapsible 
            value={activePageId || undefined}
            onValueChange={handleAccordionChange}
          >
            <SortableContext
              items={pages.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pages.map((page) => (
                <SortablePage
                  key={page.id}
                  page={page}
                  isActive={activePageId === page.id}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </Accordion>
        )}
      </div>
      
      <DragOverlay>
        {activeId && (
          <div className="opacity-80 rotate-2 scale-105">
            <div className="bg-card border-2 border-primary shadow-2xl rounded-lg p-4">
              <div className="text-sm font-medium text-foreground">
                {isDraggingPage ? 'Arrastando página...' : 'Arrastando elemento...'}
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
