export interface DesignConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    button?: string;
    buttonText?: string;
  };
  typography: {
    fontFamily: string;
    titleSize: string;
    textSize: string;
  };
  logo?: string | null;
  logoAlignment?: 'left' | 'center' | 'right';
  logoSize?: number;
  spacing: 'compact' | 'comfortable' | 'spacious';
}

export interface RoomDesignConfig {
  branding: {
    logo?: string | null;
    logoSize?: number;
    logoPosition?: 'left' | 'center' | 'right';
    companyName?: string;
    showCompanyName?: boolean;
    showLogoInLobby?: boolean;
    showLogoInMeeting?: boolean;
    extractedColors?: string[];
  };
  colors: {
    background: string;
    controlsBackground: string;
    controlsText: string;
    primaryButton: string;
    buttonTextColor?: string;
    dangerButton: string;
    avatarBackground: string;
    avatarText: string;
    participantNameBackground: string;
    participantNameText: string;
  };
  lobby: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    showDeviceSelectors?: boolean;
    showCameraPreview?: boolean;
    backgroundImage?: string | null;
  };
  meeting: {
    showParticipantCount?: boolean;
    showMeetingCode?: boolean;
    showRecordingIndicator?: boolean;
    enableReactions?: boolean;
    enableChat?: boolean;
    enableScreenShare?: boolean;
    enableRaiseHand?: boolean;
  };
  endScreen: {
    title?: string;
    message?: string;
    buttonText?: string;
    showFeedback?: boolean;
    redirectUrl?: string | null;
  };
}

export const DEFAULT_ROOM_DESIGN_CONFIG: RoomDesignConfig = {
  branding: {
    logo: null,
    logoSize: 40,
    logoPosition: 'left',
    companyName: '',
    showCompanyName: true,
    showLogoInLobby: true,
    showLogoInMeeting: true,
  },
  colors: {
    background: '#0f172a',
    controlsBackground: '#18181b',
    controlsText: '#ffffff',
    primaryButton: '#3b82f6',
    buttonTextColor: '#ffffff',
    dangerButton: '#ef4444',
    avatarBackground: '#3b82f6',
    avatarText: '#ffffff',
    participantNameBackground: 'rgba(0, 0, 0, 0.6)',
    participantNameText: '#ffffff',
  },
  lobby: {
    title: 'Pronto para participar?',
    subtitle: '',
    buttonText: 'Participar agora',
    showDeviceSelectors: true,
    showCameraPreview: true,
    backgroundImage: null,
  },
  meeting: {
    showParticipantCount: true,
    showMeetingCode: true,
    showRecordingIndicator: true,
    enableReactions: true,
    enableChat: true,
    enableScreenShare: true,
    enableRaiseHand: true,
  },
  endScreen: {
    title: 'Reunião Encerrada',
    message: 'Obrigado por participar!',
    buttonText: 'Voltar ao Início',
    showFeedback: false,
    redirectUrl: null,
  },
};

export interface AvailabilityConfig {
  weekdays: number[];
  timeSlots: { start: string; end: string }[];
  timezone: string;
  exceptions: DateException[];
}

export interface DateException {
  date: string;
  isAvailable: boolean;
  customSlots?: { start: string; end: string }[];
}

export interface LocationConfig {
  provider: '100ms' | 'google_meet' | 'zoom' | 'custom' | 'in_person';
  customUrl?: string;
  address?: string;
}

export interface BookingField {
  id: string;
  type: 'short_text' | 'email' | 'phone_number' | 'textarea' | 'select' | 'number' | 'date';
  title: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface MeetingType {
  id: string;
  tenantId: string;
  title: string;
  slug: string | null;
  description: string | null;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  availabilityConfig: AvailabilityConfig;
  locationType: string;
  locationConfig: LocationConfig;
  welcomeTitle: string | null;
  welcomeMessage: string | null;
  welcomeConfig: Record<string, any> | null;
  bookingFields: BookingField[];
  designConfig: DesignConfig;
  confirmationPageId: string | null;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface MeetingBooking {
  id: string;
  tenantId: string | null;
  meetingTypeId: string;
  reuniaoId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime: string;
  duration: number;
  timezone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  answers: Record<string, any>;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  locationUrl: string | null;
  locationDetails: string | null;
  googleEventId: string | null;
  calendarLink: string | null;
  reminderSentAt: string | null;
  notes: string | null;
  cancellationReason: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string | null;
}

export interface MeetingConfirmationPage {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  subtitle: string | null;
  confirmationMessage: string;
  showDateTime: boolean;
  showLocation: boolean;
  showAddToCalendar: boolean;
  logo: string | null;
  logoAlign: 'left' | 'center' | 'right';
  iconColor: string;
  iconImage: string | null;
  iconType: string;
  ctaText: string | null;
  ctaUrl: string | null;
  customContent: string | null;
  designConfig: DesignConfig;
  createdAt: string;
  updatedAt: string | null;
}

export interface MeetingTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number;
  designConfig: DesignConfig;
  bookingFields: BookingField[];
  availabilityConfig: AvailabilityConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailableDate {
  date: string;
  slots: TimeSlot[];
}

export interface PublicMeetingData {
  meeting: MeetingType;
  tenant: {
    id: string;
    nome: string;
    slug: string;
    logoUrl: string | null;
  };
  availableDates: AvailableDate[];
}

export interface CreateBookingRequest {
  meetingTypeId: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone?: string;
  answers: Record<string, any>;
}

export interface CreateBookingResponse {
  booking: MeetingBooking;
  confirmationPage?: MeetingConfirmationPage;
  calendarLinks: {
    google: string;
    outlook: string;
    ics: string;
  };
}

export const DEFAULT_BOOKING_FIELDS: BookingField[] = [
  {
    id: "nome",
    type: "short_text",
    title: "Nome completo",
    required: true,
    placeholder: "Digite seu nome completo"
  },
  {
    id: "email",
    type: "email",
    title: "E-mail",
    required: true,
    placeholder: "Digite seu e-mail"
  },
  {
    id: "telefone",
    type: "phone_number",
    title: "WhatsApp",
    required: true,
    placeholder: "(11) 99999-9999"
  },
  {
    id: "motivo",
    type: "textarea",
    title: "Motivo da reunião",
    description: "Descreva brevemente o assunto que deseja tratar",
    required: false,
    validation: { maxLength: 500 }
  }
];

export const DEFAULT_AVAILABILITY_CONFIG: AvailabilityConfig = {
  weekdays: [1, 2, 3, 4, 5],
  timeSlots: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "18:00" }
  ],
  timezone: "America/Sao_Paulo",
  exceptions: []
};

export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    background: "hsl(0, 0%, 100%)",
    text: "hsl(222, 47%, 11%)",
    button: "hsl(221, 19%, 16%)",
    buttonText: "hsl(0, 0%, 100%)"
  },
  typography: {
    fontFamily: "Inter",
    titleSize: "2xl",
    textSize: "base"
  },
  logo: null,
  logoAlignment: "center",
  spacing: "comfortable"
};

export const DEFAULT_DURATIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora e 30 minutos" },
  { value: 120, label: "2 horas" }
];

export const DEFAULT_TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];
