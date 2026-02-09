export interface DesignColors {
  background: string;
  secondary: string;
  primary: string;
  text: string;
  button: string;
  buttonText: string;
  progressBar?: string;
}

export interface DesignTypography {
  fontFamily: string;
  titleSize?: string;
  textSize?: string;
  fontSize?: string;
}

export interface DesignConfig {
  colors?: Partial<DesignColors>;
  typography?: Partial<DesignTypography>;
  spacing?: string;
  logo?: string | null;
  logoSize?: number;
  logoAlign?: string;
}

const defaultDesign = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    background: "hsl(0, 0%, 100%)",
    text: "hsl(222, 47%, 11%)",
    button: "hsl(221, 83%, 53%)",
    buttonText: "hsl(0, 0%, 100%)",
    progressBar: undefined as string | undefined
  },
  typography: {
    fontFamily: "Inter",
    titleSize: "2xl",
    textSize: "base"
  },
  spacing: "comfortable"
};

export function deriveDesignColors(designConfig: any): {
  colors: DesignColors;
  typography: { fontFamily: string; titleSize: string; textSize: string };
  spacing: string;
  logo?: string | null;
  logoSize?: number;
  logoAlign?: string;
} {
  const baseDesign = (designConfig as DesignConfig) ?? {};
  return {
    colors: { ...defaultDesign.colors, ...(baseDesign.colors || {}) },
    typography: { 
      ...defaultDesign.typography, 
      ...(baseDesign.typography || {}) 
    } as { fontFamily: string; titleSize: string; textSize: string },
    spacing: baseDesign.spacing || defaultDesign.spacing,
    logo: baseDesign.logo,
    logoSize: baseDesign.logoSize,
    logoAlign: baseDesign.logoAlign
  };
}
