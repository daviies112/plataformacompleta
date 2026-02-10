/**
 * ⚠️⚠️⚠️ ARQUIVO NÃO UTILIZADO - NÃO MODIFICAR ⚠️⚠️⚠️
 * 
 * Este arquivo NÃO está sendo usado no projeto!
 * Este router NÃO está registrado em server/routes.ts
 * 
 * TODAS as rotas de formulários estão em:
 * ✅ server/routes/formularios-complete.ts
 * 
 * Para fazer alterações nas rotas de formulários:
 * - Edite: server/routes/formularios-complete.ts
 * - NÃO edite este arquivo!
 * 
 * Este arquivo permanece apenas como referência histórica.
 */

import express, { Request, Response } from 'express';
import { db } from '../db';
import { forms, formSubmissions, formTemplates, completionPages, leads } from '../../shared/db-schema.js';
import { eq, desc, and, gte, lte, ilike, sql, getTableColumns } from 'drizzle-orm';
import { getGlobalSupabaseClient } from '../lib/supabaseAutoConnect.js';
import { cacheFormsMetadata, invalidateFormsCache } from '../lib/cacheStrategies';

const router = express.Router();

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// ============================================================================
// FORMS ENDPOINTS - CRUD for forms
// ============================================================================

// GET /api/forms - List all forms
router.get('/forms', async (req: Request, res: Response) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    const supabase = getGlobalSupabaseClient();
    
    if (supabase) {
      // Use cache for forms list with search/pagination as identifier
      const cacheIdentifier = `list:${search || 'all'}:${limit}:${offset}`;
      
      const formsData = await cacheFormsMetadata(
        cacheIdentifier,
        async () => {
          let query = supabase
            .from('forms')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);
          
          if (search && typeof search === 'string') {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
          }
          
          const { data, error } = await query;
          
          if (error) {
            console.error('Supabase error fetching forms:', error);
            throw error;
          }
          
          // Get submission counts for each form from local PostgreSQL
          const formsWithCounts = await Promise.all(
            (data || []).map(async (form: any) => {
              const submissionCountResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(formSubmissions)
                .where(eq(formSubmissions.formId, form.id));
              
              return {
                ...form,
                submissionCount: Number(submissionCountResult[0]?.count || 0)
              };
            })
          );
          
          return toCamelCase(formsWithCounts);
        }
      );
      
      res.json({
        success: true,
        forms: formsData,
        total: formsData.length
      });
    } else {
      // Build query with submission counts using LEFT JOIN and COUNT aggregation
      let baseQuery = db
        .select({
          ...getTableColumns(forms),
          submissionCount: sql<number>`coalesce(count(${formSubmissions.id}), 0)`
        })
        .from(forms)
        .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
        .groupBy(forms.id)
        .orderBy(desc(forms.createdAt));
      
      // Apply search filter if provided
      if (search && typeof search === 'string') {
        baseQuery = baseQuery.where(
          sql`${forms.title} ILIKE ${'%' + search + '%'} OR ${forms.description} ILIKE ${'%' + search + '%'}`
        );
      }
      
      // Execute query with pagination
      const result = await baseQuery.limit(limitNum).offset(offsetNum);
      
      res.json({
        success: true,
        forms: result,
        total: result.length
      });
    }
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forms'
    });
  }
});

// GET /api/forms/:id - Get single form
router.get('/forms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supabase = getGlobalSupabaseClient();
    
    if (supabase) {
      console.log(`🔍 [GET /api/forms/${id}] Buscando do Supabase com cache...`);
      
      const formData = await cacheFormsMetadata(
        `single:${id}`,
        async () => {
          const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              throw new Error('Form not found');
            }
            console.error('Supabase error fetching form:', error);
            throw error;
          }
          
          return toCamelCase(data);
        }
      ).catch((error) => {
        if (error.message === 'Form not found') {
          return null;
        }
        throw error;
      });
      
      if (!formData) {
        console.log(`❌ [GET /api/forms/${id}] Não encontrado no Supabase`);
        return res.status(404).json({
          success: false,
          error: 'Form not found'
        });
      }
      
      console.log(`✅ [GET /api/forms/${id}] Encontrado no Supabase:`, formData.title);
      return res.json(formData);
    }
    
    // Fallback to local PostgreSQL if Supabase not configured
    console.log(`🔍 [GET /api/forms/${id}] Buscando do PostgreSQL local...`);
    const result = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);
    
    if (result.length === 0) {
      console.log(`❌ [GET /api/forms/${id}] Não encontrado no PostgreSQL local`);
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    console.log(`✅ [GET /api/forms/${id}] Encontrado no PostgreSQL local:`, result[0].title);
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form'
    });
  }
});

// POST /api/forms - Create new form
router.post('/forms', async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      welcomeConfig,
      elements,
      questions, 
      passingScore, 
      scoreTiers, 
      designConfig, 
      completionPageId 
    } = req.body;
    
    if (!title || !questions) {
      return res.status(400).json({
        success: false,
        error: 'Title and questions are required'
      });
    }
    
    // Extract welcomeTitle and welcomeMessage for backward compatibility
    const welcomeTitle = welcomeConfig?.title || null;
    const welcomeMessage = welcomeConfig?.description || null;
    
    const result = await db
      .insert(forms)
      .values({
        title,
        description: description || null,
        welcomeTitle,
        welcomeMessage,
        welcomeConfig: welcomeConfig || null,
        questions,
        elements: elements || null,
        passingScore: passingScore || 0,
        scoreTiers: scoreTiers || null,
        designConfig: designConfig || null,
        completionPageId: completionPageId || null
      })
      .returning();
    
    // Invalidate forms cache after creating new form
    await invalidateFormsCache();
    console.log('🗑️ Forms cache invalidated after creation');
    
    res.status(201).json({
      success: true,
      form: result[0]
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create form'
    });
  }
});

// Update form handler (shared by PUT and PATCH)
const updateFormHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      welcomeConfig,
      elements,
      questions, 
      passingScore, 
      scoreTiers, 
      designConfig, 
      completionPageId 
    } = req.body;
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (questions !== undefined) updateData.questions = questions;
    if (passingScore !== undefined) updateData.passingScore = passingScore;
    if (scoreTiers !== undefined) updateData.scoreTiers = scoreTiers;
    if (designConfig !== undefined) updateData.designConfig = designConfig;
    if (completionPageId !== undefined) updateData.completionPageId = completionPageId;
    
    // Handle welcomeConfig - save complete object and extract fields for backward compatibility
    if (welcomeConfig !== undefined) {
      updateData.welcomeConfig = welcomeConfig;
      updateData.welcomeTitle = welcomeConfig?.title || null;
      updateData.welcomeMessage = welcomeConfig?.description || null;
    }
    
    // Handle elements array
    if (elements !== undefined) {
      updateData.elements = elements;
    }
    
    const result = await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    // Invalidate forms cache after updating form
    await invalidateFormsCache(`single:${id}`);
    await invalidateFormsCache('list:');
    console.log(`🗑️ Forms cache invalidated after update: ${id}`);
    
    res.json({
      success: true,
      form: result[0]
    });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update form'
    });
  }
};

// PUT /api/forms/:id - Update form
router.put('/forms/:id', updateFormHandler);

// PATCH /api/forms/:id - Update form (partial)
router.patch('/forms/:id', updateFormHandler);

// DELETE /api/forms/:id - Delete form
router.delete('/forms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(forms)
      .where(eq(forms.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    // Invalidate forms cache after deleting form
    await invalidateFormsCache(`single:${id}`);
    await invalidateFormsCache('list:');
    console.log(`🗑️ Forms cache invalidated after delete: ${id}`);
    
    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete form'
    });
  }
});

// POST /api/forms/:id/duplicate - Duplicate form
router.post('/forms/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const originalForm = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);
    
    if (originalForm.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    const form = originalForm[0];
    
    const result = await db
      .insert(forms)
      .values({
        title: `${form.title} (Cópia)`,
        description: form.description,
        welcomeTitle: form.welcomeTitle,
        welcomeMessage: form.welcomeMessage,
        welcomeConfig: form.welcomeConfig,
        questions: form.questions,
        elements: form.elements,
        passingScore: form.passingScore,
        scoreTiers: form.scoreTiers,
        designConfig: form.designConfig,
        completionPageId: form.completionPageId
      })
      .returning();
    
    res.status(201).json({
      success: true,
      form: result[0]
    });
  } catch (error) {
    console.error('Error duplicating form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate form'
    });
  }
});

// ============================================================================
// FORM SUBMISSIONS ENDPOINTS - CRUD for submissions
// ============================================================================

// GET /api/forms/:formId/submissions - Get submissions for a form
router.get('/forms/:formId/submissions', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    const supabase = getGlobalSupabaseClient();
    
    if (supabase) {
      // Fetch submissions from Supabase
      console.log(`🔍 [GET /api/forms/${formId}/submissions] Buscando do Supabase...`);
      
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);
      
      if (error) {
        console.error('Supabase error fetching submissions:', error);
        throw error;
      }
      
      console.log(`✅ [GET /api/forms/${formId}/submissions] Encontradas ${data?.length || 0} submissions no Supabase`);
      
      return res.json({
        success: true,
        submissions: toCamelCase(data || []),
        total: data?.length || 0
      });
    }
    
    // Fallback to local PostgreSQL if Supabase not configured
    console.log(`🔍 [GET /api/forms/${formId}/submissions] Buscando do PostgreSQL local...`);
    const result = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.createdAt))
      .limit(limitNum)
      .offset(offsetNum);
    
    res.json({
      success: true,
      submissions: result,
      total: result.length
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// GET /api/submissions/:id - Get single submission
router.get('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supabase = getGlobalSupabaseClient();
    
    if (supabase) {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Submission not found'
          });
        }
        throw error;
      }
      
      return res.json({
        success: true,
        submission: toCamelCase(data)
      });
    }
    
    // Fallback to local PostgreSQL
    const result = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, id))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      submission: result[0]
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission'
    });
  }
});

// POST /api/forms/:formId/submit - Submit form (public endpoint)
router.post('/forms/:formId/submit', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { 
      answers, 
      contactName, 
      contactEmail, 
      contactPhone,
      contactCpf,
      contactInstagram,
      addressData,
      companySlug
    } = req.body;
    
    console.log(`📝 [POST /forms/${formId}/submit] Recebendo submission pública...`);
    console.log(`   - Nome: ${contactName}`);
    console.log(`   - Email: ${contactEmail}`);
    console.log(`   - Telefone: ${contactPhone}`);
    console.log(`   - CPF: ${contactCpf}`);
    console.log(`   - Perguntas respondidas: ${Object.keys(answers || {}).length}`);
    
    if (!answers) {
      return res.status(400).json({
        success: false,
        error: 'Answers are required'
      });
    }
    
    // Verify form exists
    const formResult = await db
      .select()
      .from(forms)
      .where(eq(forms.id, formId))
      .limit(1);
    
    if (formResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }
    
    const form = formResult[0];
    
    // Calculate score
    let totalScore = 0;
    const questions = form.questions as any[];
    
    if (questions && Array.isArray(questions)) {
      questions.forEach((question: any) => {
        const answer = answers[question.id];
        if (answer && question.correctAnswer) {
          if (answer === question.correctAnswer) {
            totalScore += question.points || 1;
          }
        }
      });
    }
    
    const passed = totalScore >= (form.passingScore || 0);
    
    // Build submission data with all contact info
    const submissionData: any = {
      formId,
      answers: {
        ...answers,
        // Store additional contact info in answers JSON
        _contactData: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          cpf: contactCpf,
          instagram: contactInstagram,
        },
        _addressData: addressData
      },
      totalScore,
      passed,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null
    };
    
    // Create submission in local DB
    const result = await db
      .insert(formSubmissions)
      .values(submissionData)
      .returning();
    
    console.log(`✅ [POST /forms/${formId}/submit] Submission salva localmente: ${result[0].id}`);
    
    // Try to also save to Supabase if configured (for multi-tenant sync)
    try {
      const { formTenantMapping } = await import('../lib/publicCache');
      const mapping = formTenantMapping.get(formId);
      
      if (mapping?.tenantId) {
        const { getTenantSupabase } = await import('../lib/tenantSupabase');
        const supabase = await getTenantSupabase(mapping.tenantId);
        
        if (supabase) {
          const { error: supabaseError } = await supabase
            .from('form_submissions')
            .insert({
              form_id: formId,
              name: contactName,
              email: contactEmail,
              telefone: contactPhone,
              cpf: contactCpf,
              instagram: contactInstagram,
              answers,
              address_data: addressData,
              total_score: totalScore,
              passed,
              created_at: new Date().toISOString()
            });
          
          if (supabaseError) {
            console.error('⚠️ [Supabase] Erro ao salvar submission:', supabaseError.message);
          } else {
            console.log(`✅ [Supabase] Submission também salva no Supabase do tenant`);
          }
        }
      }
    } catch (supabaseErr) {
      console.error('⚠️ [Supabase] Erro ao sincronizar submission:', supabaseErr);
      // Don't fail the request if Supabase sync fails
    }
    
    res.status(201).json({
      success: true,
      submission: result[0],
      score: totalScore,
      passed
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit form'
    });
  }
});

// DELETE /api/submissions/:id - Delete submission
router.delete('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(formSubmissions)
      .where(eq(formSubmissions.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete submission'
    });
  }
});

// ============================================================================
// FORM TEMPLATES ENDPOINTS - CRUD for templates
// ============================================================================

// GET /api/form-templates - List all templates
router.get('/form-templates', async (req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(formTemplates)
      .orderBy(desc(formTemplates.createdAt));
    
    res.json({
      success: true,
      templates: result
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// GET /api/form-templates/:id - Get single template
router.get('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, id))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: result[0]
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// POST /api/form-templates - Create new template
router.post('/form-templates', async (req: Request, res: Response) => {
  try {
    const { name, description, thumbnailUrl, designConfig, questions, isDefault } = req.body;
    
    if (!name || !designConfig || !questions) {
      return res.status(400).json({
        success: false,
        error: 'Name, designConfig, and questions are required'
      });
    }
    
    const result = await db
      .insert(formTemplates)
      .values({
        name,
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        designConfig,
        questions,
        isDefault: isDefault || false
      })
      .returning();
    
    res.status(201).json({
      success: true,
      template: result[0]
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

// PUT /api/form-templates/:id - Update template
router.put('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, thumbnailUrl, designConfig, questions, isDefault } = req.body;
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (designConfig !== undefined) updateData.designConfig = designConfig;
    if (questions !== undefined) updateData.questions = questions;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    
    const result = await db
      .update(formTemplates)
      .set(updateData)
      .where(eq(formTemplates.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: result[0]
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// DELETE /api/form-templates/:id - Delete template
router.delete('/form-templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(formTemplates)
      .where(eq(formTemplates.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
});

// ============================================================================
// COMPLETION PAGES ENDPOINTS - CRUD for completion pages
// ============================================================================

// GET /api/completion-pages - List all completion pages
router.get('/completion-pages', async (req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(completionPages)
      .orderBy(desc(completionPages.createdAt));
    
    res.json({
      success: true,
      pages: result
    });
  } catch (error) {
    console.error('Error fetching completion pages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completion pages'
    });
  }
});

// GET /api/completion-pages/:id - Get single completion page
router.get('/completion-pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .select()
      .from(completionPages)
      .where(eq(completionPages.id, id))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Completion page not found'
      });
    }
    
    res.json({
      success: true,
      page: result[0]
    });
  } catch (error) {
    console.error('Error fetching completion page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completion page'
    });
  }
});

// POST /api/completion-pages - Create new completion page
router.post('/completion-pages', async (req: Request, res: Response) => {
  try {
    const {
      name,
      title,
      subtitle,
      successMessage,
      failureMessage,
      showScore,
      showTierBadge,
      logo,
      logoAlign,
      successIconColor,
      failureIconColor,
      successIconImage,
      failureIconImage,
      successIconType,
      failureIconType,
      ctaText,
      ctaUrl,
      customContent,
      designConfig
    } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }
    
    const result = await db
      .insert(completionPages)
      .values({
        name,
        title: title || 'Obrigado!',
        subtitle: subtitle || null,
        successMessage: successMessage || 'Parabéns! Você está qualificado.',
        failureMessage: failureMessage || 'Obrigado pela sua participação.',
        showScore: showScore !== undefined ? showScore : true,
        showTierBadge: showTierBadge !== undefined ? showTierBadge : true,
        logo: logo || null,
        logoAlign: logoAlign || 'center',
        successIconColor: successIconColor || 'hsl(142, 71%, 45%)',
        failureIconColor: failureIconColor || 'hsl(0, 84%, 60%)',
        successIconImage: successIconImage || null,
        failureIconImage: failureIconImage || null,
        successIconType: successIconType || 'check-circle',
        failureIconType: failureIconType || 'x-circle',
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        customContent: customContent || null,
        designConfig: designConfig || null
      })
      .returning();
    
    res.status(201).json({
      success: true,
      page: result[0]
    });
  } catch (error) {
    console.error('Error creating completion page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create completion page'
    });
  }
});

// PUT /api/completion-pages/:id - Update completion page
router.put('/completion-pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updatedAt: new Date()
    };
    
    const allowedFields = [
      'name', 'title', 'subtitle', 'successMessage', 'failureMessage',
      'showScore', 'showTierBadge', 'logo', 'logoAlign',
      'successIconColor', 'failureIconColor', 'successIconImage', 'failureIconImage',
      'successIconType', 'failureIconType', 'ctaText', 'ctaUrl',
      'customContent', 'designConfig'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const result = await db
      .update(completionPages)
      .set(updateData)
      .where(eq(completionPages.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Completion page not found'
      });
    }
    
    res.json({
      success: true,
      page: result[0]
    });
  } catch (error) {
    console.error('Error updating completion page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update completion page'
    });
  }
});

// DELETE /api/completion-pages/:id - Delete completion page
router.delete('/completion-pages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(completionPages)
      .where(eq(completionPages.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Completion page not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Completion page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting completion page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete completion page'
    });
  }
});

// ============================================================================
// STATISTICS ENDPOINTS - Get form statistics
// ============================================================================

// GET /api/forms/:formId/stats - Get statistics for a form
router.get('/forms/:formId/stats', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    
    const supabase = getGlobalSupabaseClient();
    let submissions: any[] = [];
    
    if (supabase) {
      // Fetch from Supabase
      console.log(`🔍 [GET /api/forms/${formId}/stats] Buscando estatísticas do Supabase...`);
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId);
      
      if (error) {
        console.error('Supabase error fetching submissions for stats:', error);
        throw error;
      }
      
      submissions = toCamelCase(data || []);
    } else {
      // Fallback to local PostgreSQL
      submissions = await db
        .select()
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, formId));
    }
    
    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter(s => s.passed).length;
    const failedSubmissions = totalSubmissions - passedSubmissions;
    
    const averageScore = totalSubmissions > 0
      ? submissions.reduce((sum, s) => sum + s.totalScore, 0) / totalSubmissions
      : 0;
    
    res.json({
      success: true,
      stats: {
        totalSubmissions,
        passedSubmissions,
        failedSubmissions,
        passRate: totalSubmissions > 0 ? (passedSubmissions / totalSubmissions) * 100 : 0,
        averageScore: Math.round(averageScore * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form statistics'
    });
  }
});

export const formsRoutes = router;
