export type BlockType = 
  | 'page'
  | 'text' 
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'database'
  | 'code'
  | 'image'
  | 'video'
  | 'file'
  | 'bookmark'
  | 'equation'
  | 'toggle'
  | 'audio'
  | 'link_to_page'
  | 'breadcrumb'
  | 'table_of_contents'
  | 'template'
  | 'synced_block'
  | 'embed'
  | 'pdf';

export type TextColor = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow' 
  | 'green' | 'blue' | 'purple' | 'pink' | 'red'
  | 'gray_background' | 'brown_background' | 'orange_background'
  | 'yellow_background' | 'green_background' | 'blue_background'
  | 'purple_background' | 'pink_background' | 'red_background';

export interface RichTextAnnotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: TextColor;
}

export interface RichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string };
  };
  mention?: {
    type: 'user' | 'page' | 'database' | 'date';
    [key: string]: any;
  };
  equation?: {
    expression: string;
  };
  annotations: RichTextAnnotations;
}

export interface Icon {
  type: 'emoji' | 'file' | 'external';
  emoji?: string;
  url?: string;
}

export interface Cover {
  type: 'file' | 'external' | 'gradient';
  url?: string;
  gradient?: string;
}

// Base block interface with minimal required properties
export interface BaseBlock {
  id: string;
  type: BlockType | string;
  content: string | string[];
  properties: Record<string, any>;
  checked?: boolean;
  language?: string;
  url?: string;
  caption?: string;
  color?: string;
  icon?: string;
  children?: BaseBlock[];
}

export interface Block extends BaseBlock {
  parent: string | null;
  createdTime: Date;
  lastEditedTime: Date;
  createdBy: string;
  lastEditedBy: string;
}

export interface BlockProperties {
  title?: RichText[];
  checked?: boolean;
  color?: TextColor;
  icon?: Icon;
  cover?: Cover;
  databaseId?: string;
  url?: string;
  caption?: string;
  language?: string;
  [key: string]: any;
}

export interface Page {
  id: string;
  icon?: Icon;
  cover?: Cover;
  title: RichText[];
  content: string[];
  properties: Record<string, any>;
  parent: Parent;
  archived: boolean;
  createdTime: Date;
  lastEditedTime: Date;
}

export interface Parent {
  type: 'workspace' | 'page' | 'database';
  id?: string;
}

export type DatabaseViewType = 
  | 'board'
  | 'table'
  | 'gallery'
  | 'list'
  | 'calendar'
  | 'timeline'
  | 'dashboard'
  | 'map'
  | 'chart'
  | 'feed'
  | 'form';

export type PropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'people'
  | 'files'
  | 'relation'
  | 'rollup'
  | 'formula'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'
  | 'checklists'
  | 'attachments'
  | 'custom_fields'
  | 'activities'
  | 'location';

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
  formula?: {
    expression: string;
  };
  relation?: {
    database_id: string;
    type: 'single_property' | 'dual_property';
  };
  rollup?: {
    relation_property_id: string;
    rollup_property_id: string;
    function: string;
  };
}

export interface FilterCondition {
  property: string;
  condition: string;
  value?: any;
}

export interface SortCondition {
  property: string;
  direction: 'ascending' | 'descending';
}

export interface DatabaseView {
  id: string;
  type: DatabaseViewType;
  name: string;
  filter?: FilterCondition[];
  sort?: SortCondition[];
  groupBy?: string;
  properties?: string[];
  filters?: Filter[];
  sorts?: Sort[];
}

export interface DatabaseRow {
  id: string;
  properties: Record<string, any>;
  createdTime: Date;
  lastEditedTime: Date;
  archived?: boolean;
}

// Database Field Type for simplified database
export type DatabaseFieldType = 
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'location';

// Filter types
export type FilterConditionType = 
  | 'equals'
  | 'does_not_equal'
  | 'contains'
  | 'does_not_contain'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'before'
  | 'after'
  | 'checked'
  | 'unchecked';

export interface Filter {
  id: string;
  fieldId: string;
  condition: FilterConditionType;
  value?: any;
}

// Sort types
export type SortDirection = 'asc' | 'desc' | 'ascending' | 'descending';

export interface Sort {
  id: string;
  fieldId: string;
  direction: SortDirection;
}

// Chart types
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut';

// Row style types
export type FontWeight = 'normal' | 'bold' | 'light';
export type FontSize = 'small' | 'normal' | 'large';
export type FontStyle = 'normal' | 'italic';

// Database Field
export interface DatabaseField {
  id: string;
  name: string;
  type: DatabaseFieldType;
  options?: string[];
  textColor?: string;
  bgColor?: string;
}

export interface Database {
  id: string;
  title: string | RichText[];
  fields?: DatabaseField[];
  rows?: Array<{
    id: string;
    values: Record<string, any>;
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: FontWeight;
    fontSize?: FontSize;
    fontStyle?: FontStyle;
  }>;
  properties?: DatabaseProperty[];
  views?: DatabaseView[];
  data?: DatabaseRow[];
  view?: string;
  icon?: Icon | string;
  cover?: Cover | string;
  description?: RichText[];
  filters?: Filter[];
  sorts?: Sort[];
  locked?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: Icon;
  pages: string[];
  databases: string[];
  members: string[];
}

export interface NotionState {
  pages: Record<string, Page>;
  databases: Record<string, Database>;
  blocks: Record<string, Block>;
  currentPageId: string | null;
  currentDatabaseId: string | null;
  searchQuery: string;
}
