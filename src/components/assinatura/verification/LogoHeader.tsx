import { memo } from 'react';

interface LogoHeaderProps {
    logoUrl?: string | null;
    logoSize?: 'small' | 'medium' | 'large' | string;
    logoPosition?: 'center' | 'left' | 'right' | string;
}

export const LogoHeader = memo(({
    logoUrl,
    logoSize = 'medium',
    logoPosition = 'center'
}: LogoHeaderProps) => {
    if (!logoUrl || logoUrl.trim() === '') return null;

    // Standardize size values
    const getHeight = () => {
        switch (logoSize) {
            case 'small': return '32px';
            case 'large': return '64px';
            case 'medium':
            default: return '48px';
        }
    };

    const maxHeight = getHeight();

    return (
        <div
            className="w-full pointer-events-none"
            style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: logoPosition === 'left' ? 'flex-start' : logoPosition === 'right' ? 'flex-end' : 'center',
                zIndex: 50,
            }}
        >
            <div className="flex items-center justify-center overflow-hidden">
                <img
                    src={logoUrl}
                    alt="Company Logo"
                    style={{
                        height: maxHeight,
                        width: 'auto',
                        maxWidth: '100%',
                        objectFit: 'contain'
                    }}
                />
            </div>
        </div>
    );
});

LogoHeader.displayName = 'LogoHeader';
