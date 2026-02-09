const API_BASE = '';

// Get Supabase config from localStorage
function getSupabaseConfig() {
  const url = localStorage.getItem('supabase_url');
  const anonKey = localStorage.getItem('supabase_anon_key');
  
  if (!url || !anonKey) return null;
  
  return { url, anonKey };
}

// Helper to get headers with Supabase credentials
function getHeaders(): HeadersInit {
  const config = getSupabaseConfig();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (config) {
    headers['x-supabase-url'] = config.url;
    headers['x-supabase-key'] = config.anonKey;
    console.log('🔑 [API] Enviando credenciais Supabase nos headers');
  } else {
    console.log('⚠️ [API] Supabase não configurado, usando PostgreSQL local');
  }
  
  return headers;
}

// API utility functions
export const api = {
  // Forms
  async getForms() {
    console.log('🔍 [API] Buscando formulários...');
    
    const response = await fetch(`${API_BASE}/api/forms`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch forms');
    }
    
    const data = await response.json();
    console.log('✅ [API] Formulários carregados:', data.length || 0);
    return data;
  },

  async getForm(id: string) {
    console.log('🔍 [API] Buscando formulário:', id);
    
    const response = await fetch(`${API_BASE}/api/forms/${id}`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch form');
    }
    
    return response.json();
  },

  async createForm(data: any) {
    console.log('📝 [API] Criando formulário...');
    
    const response = await fetch(`${API_BASE}/api/forms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create form');
    }
    
    const result = await response.json();
    console.log('✅ [API] Formulário criado com sucesso!');
    return result;
  },

  async updateForm(id: string, data: any) {
    console.log('📝 [API] Atualizando formulário:', id);
    
    const response = await fetch(`${API_BASE}/api/forms/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update form');
    }
    
    return response.json();
  },

  async deleteForm(id: string) {
    console.log('🗑️ [API] Deletando formulário:', id);
    
    const response = await fetch(`${API_BASE}/api/forms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete form');
    }
  },

  // Submissions
  async getSubmissions() {
    console.log('🔍 [API] Buscando submissions...');
    
    const response = await fetch(`${API_BASE}/api/submissions`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }
    
    return response.json();
  },

  async getFormSubmissions(formId: string) {
    console.log('🔍 [API] Buscando submissions do formulário:', formId);
    
    const response = await fetch(`${API_BASE}/api/forms/${formId}/submissions`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch form submissions');
    }
    
    return response.json();
  },

  async createFormSubmission(data: any) {
    console.log('📝 [API] Criando submission...');
    
    const response = await fetch(`${API_BASE}/api/submissions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create submission');
    }
    
    return response.json();
  },

  // Templates
  async getTemplates() {
    console.log('🔍 [API] Buscando templates...');
    
    const response = await fetch(`${API_BASE}/api/templates`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return response.json();
  },

  async getTemplate(id: string) {
    console.log('🔍 [API] Buscando template:', id);
    
    const response = await fetch(`${API_BASE}/api/templates/${id}`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    
    return response.json();
  },

  async createTemplate(data: any) {
    console.log('📝 [API] Criando template...');
    
    const response = await fetch(`${API_BASE}/api/templates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    return response.json();
  },

  async uploadLogo(file: File) {
    console.log('📤 [API] Fazendo upload de logo...');
    
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await fetch(`${API_BASE}/api/upload/logo`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [API] Erro no upload:', error);
      throw new Error('Failed to upload logo');
    }
    
    const result = await response.json();
    console.log('✅ [API] Logo enviada com sucesso:', result.url);
    return result.url;
  },

  // Settings
  async getSettings() {
    console.log('🔍 [API] Buscando configurações...');
    
    const response = await fetch(`${API_BASE}/api/settings`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    
    return response.json();
  },

  async saveSettings(data: { supabaseUrl: string; supabaseAnonKey: string }) {
    console.log('💾 [API] Salvando configurações...');
    
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save settings');
    }
    
    const result = await response.json();
    console.log('✅ [API] Configurações salvas com sucesso!');
    return result;
  },
};
