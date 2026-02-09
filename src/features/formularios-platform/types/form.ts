// ============================================================================
// BASE TYPES - Shared across all element types
// ============================================================================

export interface ElementStyleConfig {
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  backgroundColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  margin?: 'none' | 'sm' | 'md' | 'lg';
}

// ============================================================================
// FORM ELEMENTS - Union type for Canva-style builder
// ============================================================================

export interface QuestionOption {
  id: string;
  text: string;
  points: number;
}

// Question Element (scoring)
export interface QuestionElement {
  type: 'question';
  id: string;
  text: string;
  questionType: 'multiple-choice' | 'text';
  options?: QuestionOption[];
  points?: number;
  required?: boolean;
  style?: ElementStyleConfig;
  elementTypeVersion?: number;
}

// Heading Element (título)
export interface HeadingElement {
  type: 'heading';
  id: string;
  text: string;
  level: 1 | 2 | 3; // h1, h2, h3
  style?: ElementStyleConfig;
  elementTypeVersion?: number;
}

// Text Block Element (parágrafo/texto rico)
export interface TextElement {
  type: 'text';
  id: string;
  content: string;
  style?: ElementStyleConfig;
  elementTypeVersion?: number;
}

// Page Break Element (divisor de página)
export interface PageBreakElement {
  type: 'pageBreak';
  id: string;
  label?: string;
  showLine?: boolean;
  style?: ElementStyleConfig;
  elementTypeVersion?: number;
}

// Union type for all form elements
export type FormElement = QuestionElement | HeadingElement | TextElement | PageBreakElement;

// Type guards for element discrimination
export function isQuestionElement(element: FormElement): element is QuestionElement {
  return element.type === 'question';
}

export function isHeadingElement(element: FormElement): element is HeadingElement {
  return element.type === 'heading';
}

export function isTextElement(element: FormElement): element is TextElement {
  return element.type === 'text';
}

export function isPageBreakElement(element: FormElement): element is PageBreakElement {
  return element.type === 'pageBreak';
}

// ============================================================================
// LEGACY SUPPORT - Backward compatibility with old Question type
// ============================================================================

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text';
  options?: QuestionOption[];
  points?: number;
}

// Convert legacy Question to QuestionElement
export function questionToElement(question: Question): QuestionElement {
  return {
    type: 'question',
    id: question.id,
    text: question.text,
    questionType: question.type,
    options: question.options,
    points: question.points,
    elementTypeVersion: 1
  };
}

// Convert QuestionElement back to legacy Question (for API compatibility)
export function elementToQuestion(element: QuestionElement): Question {
  return {
    id: element.id,
    text: element.text,
    type: element.questionType,
    options: element.options,
    points: element.points
  };
}

// ============================================================================
// FORM CONFIG
// ============================================================================

export interface DesignConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    button: string;
    buttonText: string;
    progressBar?: string;
  };
  typography: {
    fontFamily: string;
    titleSize: string;
    textSize: string;
  };
  logo?: string | null;
  logoAlign?: 'left' | 'center' | 'right';
  logoSize?: number; // Logo size in pixels (default: 64)
  extractedColors?: string[]; // Colors extracted from logo
  spacing: 'compact' | 'comfortable' | 'spacious';
}

export interface WelcomePageConfig {
  title: string;
  description: string;
  buttonText?: string;
  logo?: string | null;
  titleSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  extendedDescription?: string;
  logoAlign?: 'left' | 'center' | 'right';
}

export interface CompletionPageConfig {
  title: string;
  subtitle?: string;
  successMessage: string;
  failureMessage: string;
  showScore: boolean;
  showTierBadge: boolean;
  ctaText?: string;
  ctaUrl?: string;
  customContent?: string;
  additionalThankYouText?: string;
  design?: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      successIcon: string;
      failureIcon: string;
    };
    typography: {
      fontFamily: string;
      titleSize: string;
      textSize: string;
    };
    logo?: string | null;
    logoAlign?: 'left' | 'center' | 'right';
    spacing: 'compact' | 'comfortable' | 'spacious';
  };
}

export interface ScoreTier {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  description: string;
  qualifies: boolean;
}

export interface FormConfig {
  title: string;
  description: string;
  elements: FormElement[]; // NEW: Unified elements array
  questions?: Question[]; // LEGACY: Keep for backward compatibility
  passingScore: number;
  scoreTiers?: ScoreTier[];
  designConfig?: DesignConfig;
  welcomePageConfig?: WelcomePageConfig;
  completionPageConfig?: CompletionPageConfig;
}

export interface FormAnswer {
  questionId: string;
  answer: string;
  points: number;
}

export interface FormSubmission {
  answers: FormAnswer[];
  totalScore: number;
  passed: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  designConfig: DesignConfig;
  elements: FormElement[]; // NEW: Use elements
  questions?: Question[]; // LEGACY: Keep for backward compatibility
  isDefault?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS - Migration and conversion utilities
// ============================================================================

// Convert legacy questions array to elements array
export function migrateQuestionsToElements(questions: Question[]): FormElement[] {
  return questions.map(questionToElement);
}

// Extract only question elements from mixed elements
export function extractQuestions(elements: FormElement[]): Question[] {
  return elements
    .filter(isQuestionElement)
    .map(elementToQuestion);
}

// Calculate total possible score from elements
export function calculateMaxScore(elements: FormElement[]): number {
  return elements
    .filter(isQuestionElement)
    .reduce((total, element) => {
      if (element.questionType === 'multiple-choice' && element.options) {
        const maxOptionPoints = Math.max(...element.options.map(opt => opt.points), 0);
        return total + maxOptionPoints;
      }
      return total + (element.points || 0);
    }, 0);
}

// ============================================================================
// PAGE GROUPING - Accordion/collapsible pages functionality
// ============================================================================

export interface Page {
  id: string;
  label: string;
  elements: FormElement[];
  elementCount: number;
}

// Group elements into pages based on pageBreak elements
export function groupElementsIntoPages(elements: FormElement[] | undefined | null): Page[] {
  const pages: Page[] = [];
  let currentPageElements: FormElement[] = [];
  let pageIndex = 0;

  // Defensive check: if elements is undefined, null, or not an array, return single empty page
  if (!elements || !Array.isArray(elements)) {
    return [{
      id: 'page-0',
      label: 'Página 1',
      elements: [],
      elementCount: 0
    }];
  }

  elements.forEach((element) => {
    if (isPageBreakElement(element)) {
      // Save current page if it has elements
      if (currentPageElements.length > 0) {
        const pageId = `page-${pageIndex}`;
        const label = `Página ${pageIndex + 1}`;
        pages.push({
          id: pageId,
          label,
          elements: currentPageElements,
          elementCount: currentPageElements.length
        });
        pageIndex++;
        currentPageElements = [];
      }
      // Skip consecutive page breaks
    } else {
      currentPageElements.push(element);
    }
  });

  // Add remaining elements as last page
  if (currentPageElements.length > 0) {
    const pageId = `page-${pageIndex}`;
    const label = `Página ${pageIndex + 1}`;
    pages.push({
      id: pageId,
      label,
      elements: currentPageElements,
      elementCount: currentPageElements.length
    });
  }

  // If no pages were created (no elements), return single empty page
  if (pages.length === 0) {
    pages.push({
      id: 'page-0',
      label: 'Página 1',
      elements: [],
      elementCount: 0
    });
  }

  return pages;
}

// Flatten pages back into a single elements array with pageBreaks between them
export function flattenPagesToElements(pages: Page[]): FormElement[] {
  const elements: FormElement[] = [];
  
  pages.forEach((page, index) => {
    // Add page elements
    elements.push(...page.elements);
    
    // Add page break after each page except the last one
    if (index < pages.length - 1) {
      elements.push({
        type: 'pageBreak',
        id: `pagebreak-${Date.now()}-${index}`,
        label: `Página ${index + 2}`,
        showLine: true,
        elementTypeVersion: 1
      });
    }
  });
  
  return elements;
}

// Get the page that contains a specific element
export function getPageForElement(elementId: string, pages: Page[]): Page | null {
  for (const page of pages) {
    if (page.elements.some(el => el.id === elementId)) {
      return page;
    }
  }
  return null;
}
