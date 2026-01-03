import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => localStorage.getItem('authToken');

export const authApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  register: (data: any) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  autoLogin: () => api.get('/api/auth/auto-login'),
};

export const reunioesApi = {
  list: (params?: any) => api.get('/api/reunioes', { params }),
  create: (data: any) => api.post('/api/reunioes', data),
  get: (id: string) => api.get(`/api/reunioes/${id}`),
  update: (id: string, data: any) => api.patch(`/api/reunioes/${id}`, data),
  delete: (id: string) => api.delete(`/api/reunioes/${id}`),
  checkAvailability: (data: any) => api.post('/api/reunioes/verificar-disponibilidade', data),
  getToken100ms: (id: string) => api.get(`/api/reunioes/${id}/token-100ms`),
  createInstant: (data?: any) => api.post('/api/reunioes/instantanea', data || {}),
};

export const tenantsApi = {
  me: () => api.get('/api/tenants/me'),
  update: (data: any) => api.patch('/api/tenants/me', data),
  listUsers: () => api.get('/api/tenants/usuarios'),
  addUser: (data: any) => api.post('/api/tenants/usuarios', data),
};

export const meetingTypesApi = {
  list: () => api.get('/api/meeting-types'),
  get: (id: string) => api.get(`/api/meeting-types/${id}`),
  create: (data: any) => api.post('/api/meeting-types', data),
  update: (id: string, data: any) => api.patch(`/api/meeting-types/${id}`, data),
  delete: (id: string) => api.delete(`/api/meeting-types/${id}`),
  publish: (id: string, isPublic: boolean) => api.patch(`/api/meeting-types/${id}/publish`, { isPublic }),
  duplicate: (id: string) => api.post(`/api/meeting-types/${id}/duplicate`),
};

export const bookingsApi = {
  list: (params?: { status?: string; from?: string; to?: string; meetingTypeId?: string }) => 
    api.get('/api/bookings', { params }),
  get: (id: string) => api.get(`/api/bookings/${id}`),
  updateStatus: (id: string, status: string, reason?: string) => 
    api.patch(`/api/bookings/${id}/status`, { status, cancellationReason: reason }),
  cancel: (id: string, reason?: string) => 
    api.patch(`/api/bookings/${id}/cancel`, { cancellationReason: reason }),
  addNote: (id: string, notes: string) => 
    api.patch(`/api/bookings/${id}/notes`, { notes }),
};

export const publicApi = {
  getMeeting: (company: string, slug: string) => 
    api.get(`/api/public/agendar/${company}/${slug}`),
  getAvailableSlots: (company: string, slug: string, date: string) => 
    api.get(`/api/public/agendar/${company}/${slug}/slots`, { params: { date } }),
  createBooking: (company: string, slug: string, data: any) => 
    api.post(`/api/public/agendar/${company}/${slug}`, data),
  getConfirmation: (bookingId: string) => 
    api.get(`/api/public/booking/${bookingId}/confirmation`),
  getMeetingRoom: (company: string, roomId: string) => 
    api.get(`/api/reunioes/public/${company}/${roomId}`),
  getMeetingRoomToken: (company: string, roomId: string, name: string) => 
    api.post(`/api/reunioes/public/${company}/${roomId}/token`, { name }),
};

export const confirmationPagesApi = {
  list: () => api.get('/api/confirmation-pages'),
  get: (id: string) => api.get(`/api/confirmation-pages/${id}`),
  create: (data: any) => api.post('/api/confirmation-pages', data),
  update: (id: string, data: any) => api.patch(`/api/confirmation-pages/${id}`, data),
  delete: (id: string) => api.delete(`/api/confirmation-pages/${id}`),
};

export const meetingTemplatesApi = {
  list: () => api.get('/api/meeting-templates'),
  get: (id: string) => api.get(`/api/meeting-templates/${id}`),
  create: (data: any) => api.post('/api/meeting-templates', data),
  update: (id: string, data: any) => api.patch(`/api/meeting-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/meeting-templates/${id}`),
  createFromMeetingType: (meetingTypeId: string) => 
    api.post(`/api/meeting-templates/from-meeting-type/${meetingTypeId}`),
};

export default api;
