# Standard Fields System - Complete Registration Forms

## Overview

This system provides standardized registration fields for creating complete customer registration forms with multi-tenant isolation support.

## Components Created

### 1. Standard Fields Definition
**File**: `server/formularios/services/standardFields.ts`

Contains the canonical definition of 11 standard registration fields:
- CPF/CNPJ (with cpf_cnpj validation)
- Nome/Razão Social (required, 3-200 chars)
- Data de nascimento (date field)
- E-mail (required, email validation)
- Contato (required, phone validation)
- Endereço (max 200 chars)
- Número (max 20 chars)
- Bairro (max 100 chars)
- Cidade (max 100 chars)
- CEP (with CEP validation)
- Redes sociais/Instagram (URL validation, max 200 chars)

### 2. Template Seeder Service
**File**: `server/formularios/services/templateSeeder.ts`

Provides functions for:
- Creating/ensuring complete registration templates
- Cloning forms from templates
- Adding standard fields to existing forms (with CPF/CNPJ duplication prevention)

### 3. API Endpoints
**File**: `server/routes/formularios.ts`

Three new endpoints added:

#### Create Complete Registration Template
```
POST /api/formularios/form-templates/complete-registration
```

Creates or retrieves the complete registration template for the current tenant.

**Response**:
```json
{
  "id": "uuid",
  "name": "Formulário Completo de Cadastro",
  "description": "Template completo com todos os campos essenciais...",
  "questions": [...11 standard fields...],
  "design_config": {...},
  "is_default": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Clone Form from Template
```
POST /api/formularios/forms/from-template/:templateId
Content-Type: application/json

{
  "title": "Meu Formulário de Cadastro",
  "description": "Descrição opcional",
  "passingScore": 0
}
```

Creates a new form by cloning a template.

**Response**:
```json
{
  "id": "uuid",
  "title": "Meu Formulário de Cadastro",
  "description": "Descrição opcional",
  "questions": [...cloned fields...],
  "design_config": {...},
  "passing_score": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Add Standard Fields to Form
```
POST /api/formularios/forms/:formId/add-standard-fields
```

Adds all 11 standard fields to an existing form. **Prevents duplication** of CPF/CNPJ field if already present.

**Response**:
```json
{
  "id": "uuid",
  "title": "Form Title",
  "questions": [...existing + new fields...],
  ...
}
```

## Multi-Tenant Support

All endpoints respect multi-tenant isolation:

- **Supabase Mode**: Uses tenant-specific Supabase client (via session)
- **Local Mode**: Uses local PostgreSQL database
- Automatically handled by `getSupabaseClientForFormularios()` function

## Field Structure

Each standard field follows this structure:

```typescript
{
  id: string;              // Unique identifier
  type: string;            // Field type (short_text, email, phone_number, date)
  title: string;           // Field label
  description?: string;    // Help text
  required: boolean;       // Whether field is mandatory
  fieldType?: string;      // Special validation type (cpf_cnpj, cep)
  validation?: {
    type?: string;         // Validation type
    pattern?: string;      // Regex pattern
    minLength?: number;    // Min character length
    maxLength?: number;    // Max character length
  };
  score?: number;          // Points for scoring system
}
```

## CPF/CNPJ Duplication Prevention

When adding standard fields to a form that already contains a CPF/CNPJ field, the system:

1. Detects existing CPF/CNPJ fields by checking:
   - `fieldType === "cpf_cnpj"`
   - `id === "cpf_cnpj"`
   - Title contains "cpf" or "cnpj" (case insensitive)

2. Excludes the CPF/CNPJ field from the new fields being added

3. Adds only the remaining 10 standard fields

## Testing

### Prerequisites

1. User must be logged in (endpoints are protected by `requireTenant` middleware)
2. Browser session or valid authentication cookie required

### Manual Testing via Browser

1. **Login** to the application
2. **Open DevTools Console**
3. **Execute tests**:

```javascript
// 1. Create template
const templateResponse = await fetch('/api/formularios/form-templates/complete-registration', {
  method: 'POST',
  credentials: 'include'
});
const template = await templateResponse.json();
console.log('Template:', template);

// 2. Clone form from template
const formResponse = await fetch(`/api/formularios/forms/from-template/${template.id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: 'Meu Formulário de Teste',
    description: 'Teste de clonagem'
  })
});
const newForm = await formResponse.json();
console.log('New Form:', newForm);

// 3. Add standard fields to an existing form
const addFieldsResponse = await fetch(`/api/formularios/forms/${newForm.id}/add-standard-fields`, {
  method: 'POST',
  credentials: 'include'
});
const updatedForm = await addFieldsResponse.json();
console.log('Updated Form:', updatedForm);
console.log('Total Fields:', updatedForm.questions?.length);
```

### Expected Results

✅ **Template Creation**:
- Returns template with 11 standard fields
- Same template returned on subsequent calls (idempotent)

✅ **Form Cloning**:
- New form created with all 11 fields from template
- Custom title and description applied

✅ **Adding Standard Fields**:
- First call: Adds 11 fields to empty form
- Second call: Adds only 10 fields (CPF/CNPJ already exists)
- CPF/CNPJ field NOT duplicated

## Success Criteria

- [x] Standard fields definition file created with 11 fields
- [x] Template seeder service with 3 functions created
- [x] 3 endpoints added to routes
- [x] Multi-tenant support implemented
- [x] CPF/CNPJ duplication prevention working
- [x] All fields have correct types and validations

## Files Modified

1. `server/formularios/services/standardFields.ts` (NEW)
2. `server/formularios/services/templateSeeder.ts` (NEW)
3. `server/routes/formularios.ts` (MODIFIED - endpoints added)
4. `server/formularios/scripts/test-standard-fields.ts` (NEW - test suite)

## Architecture Notes

The system follows the existing architecture:
- Uses Express Router for routing
- Respects multi-tenant isolation via `requireTenant` middleware
- Compatible with both Supabase and local PostgreSQL
- Follows existing naming conventions and code style
- JSONB structure matches existing form schema
