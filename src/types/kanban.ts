export type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue' | 'sky' | 'lime' | 'pink' | 'black';

export interface Label {
  id: string;
  name: string;
  color: string; // Aceita qualquer cor hex ou LabelColor
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  addedAt: Date;
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select';
  options?: string[];
  color?: LabelColor;
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
}

export interface CardCover {
  type: 'color' | 'image';
  value: string;
  size: 'normal' | 'full';
}

export interface Activity {
  id: string;
  type: 'comment' | 'action';
  user: Member;
  content: string;
  timestamp: Date;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  labels: Label[];
  dueDate?: Date;
  dueTime?: string; // Horário separado no formato HH:mm
  completed: boolean;
  checklists: Checklist[];
  members: Member[];
  cover?: CardCover;
  attachments: Attachment[];
  customFields: CustomField[];
  activities: Activity[];
  location?: Location;
  archived?: boolean;
  position?: number;
}

export interface List {
  id: string;
  title: string;
  cards: Card[];
  archived?: boolean;
  position?: number;
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
  labels: Label[];
  background?: {
    type: 'color' | 'image';
    value: string;
  };
  description?: string;
  starred?: boolean;
  favorited?: boolean;
  icon?: string;
  locked?: boolean;
  themeId?: string;
}
