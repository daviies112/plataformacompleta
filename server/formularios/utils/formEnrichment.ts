import { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { forms, formSubmissions } from '../../../shared/db-schema';
import { eq, desc, sql, getTableColumns, inArray } from 'drizzle-orm';

export interface FormWithSubmissionCount {
  id: string;
  title: string;
  description?: string | null;
  submissionCount: number;
  [key: string]: any;
}

/**
 * Enriches forms with submission counts from form_submissions table
 * 
 * For Supabase: Fetches all submissions in bulk and aggregates in-memory to avoid N+1
 * For PostgreSQL: Uses LEFT JOIN and COUNT for efficient bulk aggregation
 * 
 * @param supabase - Optional Supabase client. If provided, uses Supabase; otherwise uses local PostgreSQL
 * @param formsData - Optional array of forms (for Supabase path). If not provided, fetches from database
 * @returns Array of forms with submissionCount field
 */
export async function enrichFormsWithSubmissionCount(
  supabase?: SupabaseClient | null,
  formsData?: any[]
): Promise<FormWithSubmissionCount[]> {
  if (supabase) {
    console.log('📊 [ENRICHMENT] Using Supabase for submission counts...');
    
    // If forms not provided, fetch them
    let formsToEnrich = formsData;
    if (!formsToEnrich) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [ENRICHMENT] Error fetching forms from Supabase:', error);
        throw error;
      }
      
      formsToEnrich = data || [];
    }
    
    if (!formsToEnrich || formsToEnrich.length === 0) {
      console.log('ℹ️ [ENRICHMENT] No forms to enrich');
      return [];
    }
    
    // Extract all form IDs
    const formIds = formsToEnrich.map((form: any) => form.id);
    
    // Fetch ALL submissions for these forms in one query (avoids N+1)
    const { data: submissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('form_id')
      .in('form_id', formIds);
    
    if (submissionsError) {
      console.error('❌ [ENRICHMENT] Error fetching submissions from Supabase:', submissionsError);
      // Don't throw - just set counts to 0
      return formsToEnrich.map((form: any) => ({
        ...form,
        submissionCount: 0
      }));
    }
    
    // Aggregate submission counts in-memory
    const submissionCountMap = new Map<string, number>();
    
    if (submissions) {
      for (const submission of submissions) {
        const currentCount = submissionCountMap.get(submission.form_id) || 0;
        submissionCountMap.set(submission.form_id, currentCount + 1);
      }
    }
    
    // Enrich forms with counts
    const enrichedForms = formsToEnrich.map((form: any) => ({
      ...form,
      submissionCount: submissionCountMap.get(form.id) || 0
    }));
    
    console.log(`✅ [ENRICHMENT] Enriched ${enrichedForms.length} forms from Supabase`);
    return enrichedForms;
  } else {
    console.log('📊 [ENRICHMENT] Using local PostgreSQL for submission counts...');
    
    // If forms data provided (pre-formatted camelCase), enrich in-memory
    if (formsData !== undefined && formsData !== null) {
      // Early return for empty arrays to avoid unnecessary database queries
      if (formsData.length === 0) {
        console.log('ℹ️ [ENRICHMENT] No forms to enrich (empty array)');
        return [];
      }
      
      console.log('📊 [ENRICHMENT] Enriching provided forms data with submission counts...');
      
      const formIds = formsData.map((form: any) => form.id);
      
      // Fetch ALL submissions for these forms in one query (avoid N+1)
      const submissions = await db
        .select({ formId: formSubmissions.formId })
        .from(formSubmissions)
        .where(inArray(formSubmissions.formId, formIds));
      
      // Aggregate submission counts in-memory
      const submissionCountMap = new Map<string, number>();
      for (const submission of submissions) {
        const currentCount = submissionCountMap.get(submission.formId) || 0;
        submissionCountMap.set(submission.formId, currentCount + 1);
      }
      
      // Enrich forms with counts (preserve original camelCase format)
      const enrichedForms = formsData.map((form: any) => ({
        ...form,
        submissionCount: submissionCountMap.get(form.id) || 0
      }));
      
      console.log(`✅ [ENRICHMENT] Enriched ${enrichedForms.length} provided forms from PostgreSQL`);
      return enrichedForms;
    }
    
    // Otherwise, use LEFT JOIN with COUNT for efficient bulk aggregation
    const result = await db
      .select({
        ...getTableColumns(forms),
        submissionCount: sql<number>`coalesce(count(${formSubmissions.id}), 0)`
      })
      .from(forms)
      .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
      .groupBy(forms.id)
      .orderBy(desc(forms.createdAt));
    
    console.log(`✅ [ENRICHMENT] Enriched ${result.length} forms from PostgreSQL`);
    return result as FormWithSubmissionCount[];
  }
}

/**
 * Enriches a single form with submission count
 * 
 * @param supabase - Optional Supabase client
 * @param formId - ID of the form to enrich
 * @param formData - Optional form data (for Supabase path)
 * @returns Form with submissionCount field
 */
export async function enrichFormWithSubmissionCount(
  supabase: SupabaseClient | null | undefined,
  formId: string,
  formData?: any
): Promise<FormWithSubmissionCount | null> {
  if (supabase) {
    console.log('📊 [ENRICHMENT] Using Supabase for single form submission count...');
    
    // Fetch submission count for this specific form
    const { count, error } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    
    if (error) {
      console.error('❌ [ENRICHMENT] Error fetching submission count from Supabase:', error);
      return formData ? { ...formData, submissionCount: 0 } : null;
    }
    
    const submissionCount = count || 0;
    
    if (formData) {
      return { ...formData, submissionCount };
    }
    
    // If no form data provided, fetch it
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('❌ [ENRICHMENT] Error fetching form from Supabase:', formError);
      return null;
    }
    
    return { ...form, submissionCount };
  } else {
    console.log('📊 [ENRICHMENT] Using local PostgreSQL for single form submission count...');
    
    const result = await db
      .select({
        ...getTableColumns(forms),
        submissionCount: sql<number>`coalesce(count(${formSubmissions.id}), 0)`
      })
      .from(forms)
      .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
      .where(eq(forms.id, formId))
      .groupBy(forms.id)
      .limit(1);
    
    return result[0] || null;
  }
}
