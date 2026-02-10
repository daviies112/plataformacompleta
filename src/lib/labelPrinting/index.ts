/**
 * Label Printing Library
 * 
 * Centralized module for label design, printing, and template management
 * Uses browser-based PDF printing - no external software required
 */

export { generateZPL, generateTestZPL } from './zplConverter';
export type { ZPLElement, ZPLOptions } from './zplConverter';

export { defaultTemplates, getTemplatesByCategory, getTemplateByName } from './defaultTemplates';
export type { LabelTemplate } from './defaultTemplates';
