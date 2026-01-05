export interface Meeting {
  id: string;
  tenantId: string;
  usuarioId?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  duracao?: number;
  status: 'agendada' | 'cancelada' | 'concluida' | 'em_andamento' | 'finalizada';
  roomId100ms?: string;
  linkReuniao?: string;
  participantes?: any[];
  createdAt?: string;
  updatedAt?: string;
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
  };
  colors: {
    background: string;
    controlsBackground: string;
    controlsText: string;
    primaryButton: string;
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
    showFeedback: false,
    redirectUrl: null,
  },
};

export interface CreateMeetingData {
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  duracao?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  participantes?: any[];
}
