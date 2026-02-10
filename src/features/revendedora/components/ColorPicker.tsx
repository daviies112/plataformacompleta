import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { hexToHSL } from "@/features/revendedora/utils/colorExtractor";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`color-${label}`}>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-3 items-center">
        <div className="relative">
          <input
            type="color"
            value={localValue}
            onChange={handleColorInputChange}
            className={`h-12 w-12 rounded cursor-pointer border-2 border-border transition-all ${
              isAnimating ? 'ring-4 ring-primary/30 scale-110' : ''
            }`}
          />
        </div>
        <div className="flex-1">
          <Input
            id={`color-${label}`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="#000000"
            maxLength={7}
            className={`font-mono transition-all ${
              isAnimating ? 'ring-2 ring-primary/50' : ''
            }`}
          />
        </div>
        <div className="min-w-[120px] text-sm text-muted-foreground font-mono">
          HSL: {hexToHSL(localValue)}
        </div>
      </div>
    </div>
  );
}
