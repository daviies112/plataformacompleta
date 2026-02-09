import { useEffect, useState, useMemo } from 'react';
import { 
  Type, Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Minus, Image as ImageIcon,
  Video, FileAudio, FileText, Table, Columns,
  Lightbulb, ChevronRight, Link as LinkIcon, Bookmark, Calculator,
  FileUp, Database, LayoutGrid, Calendar, LayoutList, GanttChart,
  Navigation, ListTree, Copy, Link2, Globe, Kanban
} from 'lucide-react';

interface BlockMenuProps {
  position: { x: number; y: number };
  onSelect: (type: string) => void;
  onClose: () => void;
  searchQuery?: string;
}

interface BlockOption {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'basic' | 'inline' | 'media' | 'embeds' | 'database' | 'advanced';
  keywords: string[];
}

export const BlockMenu = ({ position, onSelect, onClose, searchQuery = '' }: BlockMenuProps) => {
  const allOptions: BlockOption[] = useMemo(() => [
    // BLOCOS BÁSICOS
    { type: 'text', label: 'Texto', description: 'Comece a escrever com texto simples', icon: <Type className="h-4 w-4" />, category: 'basic', keywords: ['texto', 'text', 'parágrafo', 'paragraph'] },
    { type: 'h1', label: 'Título 1', description: 'Título grande', icon: <Heading1 className="h-4 w-4" />, category: 'basic', keywords: ['título', 'heading', 'h1', '#'] },
    { type: 'h2', label: 'Título 2', description: 'Título médio', icon: <Heading2 className="h-4 w-4" />, category: 'basic', keywords: ['título', 'heading', 'h2', '##'] },
    { type: 'h3', label: 'Título 3', description: 'Título pequeno', icon: <Heading3 className="h-4 w-4" />, category: 'basic', keywords: ['título', 'heading', 'h3', '###'] },
    { type: 'bullet', label: 'Lista com marcadores', description: 'Criar uma lista com marcadores', icon: <List className="h-4 w-4" />, category: 'basic', keywords: ['lista', 'bullet', 'marcadores', '*'] },
    { type: 'numbered', label: 'Lista numerada', description: 'Criar uma lista numerada', icon: <ListOrdered className="h-4 w-4" />, category: 'basic', keywords: ['lista', 'numbered', 'numerada', '1.'] },
    { type: 'todo', label: 'Lista de tarefas', description: 'Acompanhar tarefas com checkbox', icon: <CheckSquare className="h-4 w-4" />, category: 'basic', keywords: ['lista', 'todo', 'tarefa', 'checkbox', '[]', 'to-do'] },
    { type: 'toggle', label: 'Lista de alternantes', description: 'Alternar para ocultar/mostrar', icon: <ChevronRight className="h-4 w-4" />, category: 'basic', keywords: ['toggle', 'alternar', 'ocultar', 'collapse'] },
    { type: 'quote', label: 'Citação', description: 'Capturar uma citação', icon: <Quote className="h-4 w-4" />, category: 'basic', keywords: ['citação', 'quote', '>', 'blockquote'] },
    { type: 'divider', label: 'Divisor', description: 'Dividir blocos visualmente', icon: <Minus className="h-4 w-4" />, category: 'basic', keywords: ['divisor', 'divider', 'linha', '---', 'separator'] },
    { type: 'callout', label: 'Frase de destaque', description: 'Destacar importante', icon: <Lightbulb className="h-4 w-4" />, category: 'basic', keywords: ['callout', 'destaque', 'importante', 'alert'] },
    
    // BLOCOS INLINE
    { type: 'page', label: 'Página', description: 'Criar uma sub-página', icon: <FileText className="h-4 w-4" />, category: 'inline', keywords: ['página', 'page', 'sub', 'child'] },
    { type: 'link_to_page', label: 'Link para a página', description: 'Link para outra página', icon: <LinkIcon className="h-4 w-4" />, category: 'inline', keywords: ['link', 'página', 'referência', 'internal'] },
    
    // BLOCOS DE MÍDIA
    { type: 'image', label: 'Imagem', description: 'Fazer upload ou incorporar', icon: <ImageIcon className="h-4 w-4" />, category: 'media', keywords: ['imagem', 'image', 'foto', 'picture', 'img'] },
    { type: 'video', label: 'Vídeo', description: 'Incorporar do YouTube, Vimeo', icon: <Video className="h-4 w-4" />, category: 'media', keywords: ['vídeo', 'video', 'youtube', 'vimeo'] },
    { type: 'audio', label: 'Áudio', description: 'Incorporar gravação de áudio', icon: <FileAudio className="h-4 w-4" />, category: 'media', keywords: ['áudio', 'audio', 'som', 'sound'] },
    { type: 'file', label: 'Arquivo', description: 'Fazer upload de um arquivo', icon: <FileUp className="h-4 w-4" />, category: 'media', keywords: ['arquivo', 'file', 'upload', 'attachment'] },
    { type: 'code', label: 'Código', description: 'Capturar um trecho de código', icon: <Code className="h-4 w-4" />, category: 'media', keywords: ['código', 'code', '```', 'snippet'] },
    { type: 'equation', label: 'Equação', description: 'Equação matemática LaTeX', icon: <Calculator className="h-4 w-4" />, category: 'media', keywords: ['equação', 'equation', 'math', 'latex', 'matemática'] },
    
    // BLOCOS DE EMBEDS
    { type: 'bookmark', label: 'Bookmark', description: 'Salvar um link com preview', icon: <Bookmark className="h-4 w-4" />, category: 'embeds', keywords: ['bookmark', 'link', 'url', 'favorito'] },
    { type: 'embed', label: 'Embed', description: 'Incorporar conteúdo externo', icon: <Globe className="h-4 w-4" />, category: 'embeds', keywords: ['embed', 'incorporar', 'iframe', 'external'] },
    { type: 'pdf', label: 'PDF', description: 'Incorporar arquivo PDF', icon: <FileText className="h-4 w-4" />, category: 'embeds', keywords: ['pdf', 'documento', 'document'] },
    
    // BLOCOS DE DATABASE
    { type: 'table', label: 'Tabela', description: 'Adicionar uma tabela', icon: <Table className="h-4 w-4" />, category: 'database', keywords: ['tabela', 'table', 'database', 'dados'] },
    { type: 'board', label: 'Quadro', description: 'Visualização Kanban', icon: <Kanban className="h-4 w-4" />, category: 'database', keywords: ['board', 'quadro', 'kanban'] },
    { type: 'gallery', label: 'Galeria', description: 'Visualização em galeria', icon: <LayoutGrid className="h-4 w-4" />, category: 'database', keywords: ['galeria', 'gallery', 'grid'] },
    { type: 'list', label: 'Lista', description: 'Visualização em lista', icon: <LayoutList className="h-4 w-4" />, category: 'database', keywords: ['lista', 'list', 'simple'] },
    { type: 'calendar', label: 'Calendário', description: 'Visualização de calendário', icon: <Calendar className="h-4 w-4" />, category: 'database', keywords: ['calendário', 'calendar', 'agenda'] },
    { type: 'timeline', label: 'Linha do tempo', description: 'Visualização de linha do tempo', icon: <GanttChart className="h-4 w-4" />, category: 'database', keywords: ['timeline', 'linha do tempo', 'gantt'] },
    
    // BLOCOS AVANÇADOS
    { type: 'breadcrumb', label: 'Breadcrumb', description: 'Navegação em breadcrumb', icon: <Navigation className="h-4 w-4" />, category: 'advanced', keywords: ['breadcrumb', 'navegação', 'navigation', 'trail'] },
    { type: 'table_of_contents', label: 'Sumário', description: 'Sumário da página', icon: <ListTree className="h-4 w-4" />, category: 'advanced', keywords: ['sumário', 'table of contents', 'toc', 'índice'] },
    { type: 'template', label: 'Template', description: 'Criar um botão de template', icon: <Copy className="h-4 w-4" />, category: 'advanced', keywords: ['template', 'modelo', 'duplicate'] },
    { type: 'synced_block', label: 'Bloco sincronizado', description: 'Sincronizar com outro bloco', icon: <Link2 className="h-4 w-4" />, category: 'advanced', keywords: ['synced', 'sincronizado', 'mirror', 'reference'] },
  ], []);

  const [filteredOptions, setFilteredOptions] = useState(allOptions);

  useEffect(() => {
    const query = searchQuery.toLowerCase().replace('/', '');
    if (!query) {
      setFilteredOptions(allOptions);
      return;
    }

    const filtered = allOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
    setFilteredOptions(filtered);
  }, [searchQuery, allOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.block-menu')) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const groupedOptions = useMemo(() => {
    const grouped: Record<string, BlockOption[]> = {
      basic: [],
      inline: [],
      media: [],
      embeds: [],
      database: [],
      advanced: []
    };

    filteredOptions.forEach(option => {
      grouped[option.category].push(option);
    });

    return grouped;
  }, [filteredOptions]);

  const categoryLabels = {
    basic: 'Blocos básicos',
    inline: 'Inline',
    media: 'Mídia',
    embeds: 'Embeds',
    database: 'Database',
    advanced: 'Avançado'
  };

  return (
    <div
      className="block-menu fixed bg-popover border border-border rounded-lg shadow-lg py-2 min-w-[320px] max-h-[500px] overflow-y-auto z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {searchQuery && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-2">
          Digite para filtrar
        </div>
      )}

      {Object.entries(groupedOptions).map(([category, options]) => {
        if (options.length === 0) return null;

        return (
          <div key={category} className="mb-2 last:mb-0">
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </div>
            {options.map((option) => (
              <button
                key={option.type}
                onClick={() => onSelect(option.type)}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3 group"
              >
                <span className="text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        );
      })}

      {filteredOptions.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          Nenhum bloco encontrado
        </div>
      )}
    </div>
  );
};
