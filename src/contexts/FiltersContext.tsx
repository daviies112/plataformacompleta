import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Card, LabelColor } from '@/types/kanban';

export interface FiltersState {
  keyword: string;
  members: {
    none: boolean;
    me: boolean;
  };
  status: {
    completed: boolean;
    notCompleted: boolean;
  };
  due: {
    none: boolean;
    overdue: boolean;
    day: boolean;
    week: boolean;
    month: boolean;
  };
  labels: {
    none: boolean;
    colors: LabelColor[];
  };
  activity: {
    none: boolean;
    w1: boolean;
    w2: boolean;
    w4: boolean;
  };
  mode: 'AND' | 'OR';
  collapseNonMatchingLists: boolean;
}

interface FiltersContextType {
  filters: FiltersState;
  currentUserId: string;
  setKeyword: (keyword: string) => void;
  toggleMemberNone: () => void;
  toggleMemberMe: () => void;
  toggleStatusCompleted: () => void;
  toggleStatusNotCompleted: () => void;
  toggleDueNone: () => void;
  toggleDueOverdue: () => void;
  toggleDueDay: () => void;
  toggleDueWeek: () => void;
  toggleDueMonth: () => void;
  toggleLabelNone: () => void;
  toggleLabelColor: (color: LabelColor) => void;
  toggleActivityNone: () => void;
  toggleActivityW1: () => void;
  toggleActivityW2: () => void;
  toggleActivityW4: () => void;
  toggleMode: () => void;
  toggleCollapseNonMatchingLists: () => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

const defaultFiltersState: FiltersState = {
  keyword: '',
  members: { none: false, me: false },
  status: { completed: false, notCompleted: false },
  due: { none: false, overdue: false, day: false, week: false, month: false },
  labels: { none: false, colors: [] },
  activity: { none: false, w1: false, w2: false, w4: false },
  mode: 'AND',
  collapseNonMatchingLists: false,
};

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>(defaultFiltersState);
  const currentUserId = 'user-1';

  const hasActiveFilters = useMemo(() => {
    return (
      filters.keyword.trim() !== '' ||
      filters.members.none ||
      filters.members.me ||
      filters.status.completed ||
      filters.status.notCompleted ||
      filters.due.none ||
      filters.due.overdue ||
      filters.due.day ||
      filters.due.week ||
      filters.due.month ||
      filters.labels.none ||
      filters.labels.colors.length > 0 ||
      filters.activity.none ||
      filters.activity.w1 ||
      filters.activity.w2 ||
      filters.activity.w4
    );
  }, [filters]);

  const setKeyword = (keyword: string) => {
    setFilters(prev => ({ ...prev, keyword }));
  };

  const toggleMemberNone = () => {
    setFilters(prev => ({ ...prev, members: { ...prev.members, none: !prev.members.none } }));
  };

  const toggleMemberMe = () => {
    setFilters(prev => ({ ...prev, members: { ...prev.members, me: !prev.members.me } }));
  };

  const toggleStatusCompleted = () => {
    setFilters(prev => ({ ...prev, status: { ...prev.status, completed: !prev.status.completed } }));
  };

  const toggleStatusNotCompleted = () => {
    setFilters(prev => ({ ...prev, status: { ...prev.status, notCompleted: !prev.status.notCompleted } }));
  };

  const toggleDueNone = () => {
    setFilters(prev => ({ ...prev, due: { ...prev.due, none: !prev.due.none } }));
  };

  const toggleDueOverdue = () => {
    setFilters(prev => ({ ...prev, due: { ...prev.due, overdue: !prev.due.overdue } }));
  };

  const toggleDueDay = () => {
    setFilters(prev => ({ ...prev, due: { ...prev.due, day: !prev.due.day } }));
  };

  const toggleDueWeek = () => {
    setFilters(prev => ({ ...prev, due: { ...prev.due, week: !prev.due.week } }));
  };

  const toggleDueMonth = () => {
    setFilters(prev => ({ ...prev, due: { ...prev.due, month: !prev.due.month } }));
  };

  const toggleLabelNone = () => {
    setFilters(prev => ({ ...prev, labels: { ...prev.labels, none: !prev.labels.none } }));
  };

  const toggleLabelColor = (color: LabelColor) => {
    setFilters(prev => {
      const colors = prev.labels.colors.includes(color)
        ? prev.labels.colors.filter(c => c !== color)
        : [...prev.labels.colors, color];
      return { ...prev, labels: { ...prev.labels, colors } };
    });
  };

  const toggleActivityNone = () => {
    setFilters(prev => ({ ...prev, activity: { ...prev.activity, none: !prev.activity.none } }));
  };

  const toggleActivityW1 = () => {
    setFilters(prev => ({ ...prev, activity: { ...prev.activity, w1: !prev.activity.w1 } }));
  };

  const toggleActivityW2 = () => {
    setFilters(prev => ({ ...prev, activity: { ...prev.activity, w2: !prev.activity.w2 } }));
  };

  const toggleActivityW4 = () => {
    setFilters(prev => ({ ...prev, activity: { ...prev.activity, w4: !prev.activity.w4 } }));
  };

  const toggleMode = () => {
    setFilters(prev => ({ ...prev, mode: prev.mode === 'AND' ? 'OR' : 'AND' }));
  };

  const toggleCollapseNonMatchingLists = () => {
    setFilters(prev => ({ ...prev, collapseNonMatchingLists: !prev.collapseNonMatchingLists }));
  };

  const clearAllFilters = () => {
    setFilters(defaultFiltersState);
  };

  return (
    <FiltersContext.Provider
      value={{
        filters,
        currentUserId,
        setKeyword,
        toggleMemberNone,
        toggleMemberMe,
        toggleStatusCompleted,
        toggleStatusNotCompleted,
        toggleDueNone,
        toggleDueOverdue,
        toggleDueDay,
        toggleDueWeek,
        toggleDueMonth,
        toggleLabelNone,
        toggleLabelColor,
        toggleActivityNone,
        toggleActivityW1,
        toggleActivityW2,
        toggleActivityW4,
        toggleMode,
        toggleCollapseNonMatchingLists,
        clearAllFilters,
        hasActiveFilters,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}

export function matchesFilters(card: Card, filters: FiltersState, currentUserId: string): boolean {
  const facetResults: boolean[] = [];

  if (filters.keyword.trim()) {
    const keyword = filters.keyword.toLowerCase();
    const matchesKeyword = 
      card.title.toLowerCase().includes(keyword) ||
      (card.description?.toLowerCase().includes(keyword) ?? false) ||
      card.labels.some(l => l.name?.toLowerCase().includes(keyword)) ||
      card.members.some(m => 
        m.name.toLowerCase().includes(keyword) || 
        m.initials.toLowerCase().includes(keyword)
      );
    facetResults.push(matchesKeyword);
  }

  if (filters.members.none || filters.members.me) {
    const memberMatch = 
      (filters.members.none && card.members.length === 0) ||
      (filters.members.me && card.members.some(m => m.id === currentUserId));
    facetResults.push(memberMatch);
  }

  if (filters.status.completed || filters.status.notCompleted) {
    const statusMatch = 
      (filters.status.completed && card.completed === true) ||
      (filters.status.notCompleted && card.completed === false);
    facetResults.push(statusMatch);
  }

  if (filters.due.none || filters.due.overdue || filters.due.day || filters.due.week || filters.due.month) {
    const now = new Date();
    const dueDate = card.dueDate ? new Date(card.dueDate) : null;
    
    const dueMatch = 
      (filters.due.none && !dueDate) ||
      (filters.due.overdue && dueDate && dueDate < now) ||
      (filters.due.day && dueDate && dueDate > now && (dueDate.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000) ||
      (filters.due.week && dueDate && dueDate > now && (dueDate.getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000) ||
      (filters.due.month && dueDate && dueDate > now && (dueDate.getTime() - now.getTime()) <= 30 * 24 * 60 * 60 * 1000);
    facetResults.push(dueMatch);
  }

  if (filters.labels.none || filters.labels.colors.length > 0) {
    const labelMatch = 
      (filters.labels.none && card.labels.length === 0) ||
      (filters.labels.colors.length > 0 && card.labels.some(l => filters.labels.colors.includes(l.color)));
    facetResults.push(labelMatch);
  }

  if (filters.activity.none || filters.activity.w1 || filters.activity.w2 || filters.activity.w4) {
    const now = new Date();
    const lastActivity = card.activities.length > 0 
      ? Math.max(...card.activities.map(a => new Date(a.timestamp).getTime()))
      : null;
    
    const activityMatch = 
      (filters.activity.none && !lastActivity) ||
      (filters.activity.w1 && lastActivity && (now.getTime() - lastActivity) <= 7 * 24 * 60 * 60 * 1000) ||
      (filters.activity.w2 && lastActivity && (now.getTime() - lastActivity) <= 14 * 24 * 60 * 60 * 1000) ||
      (filters.activity.w4 && lastActivity && (now.getTime() - lastActivity) <= 28 * 24 * 60 * 60 * 1000);
    facetResults.push(activityMatch);
  }

  if (facetResults.length === 0) {
    return true;
  }

  return filters.mode === 'OR' 
    ? facetResults.some(r => r === true)
    : facetResults.every(r => r === true);
}
