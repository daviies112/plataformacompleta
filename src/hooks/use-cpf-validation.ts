import { useState, useCallback } from "react";
import { validateCPF, formatCPF, normalizeCPF } from "@/lib/cpf-utils";

export function useCpfValidation() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((input: string) => {
    // Remove tudo exceto números
    const cleaned = input.replace(/\D/g, "");
    
    // Limita a 11 dígitos
    const limited = cleaned.slice(0, 11);
    
    // Formata automaticamente enquanto digita
    let formatted = limited;
    if (limited.length > 3) {
      formatted = limited.slice(0, 3) + "." + limited.slice(3);
    }
    if (limited.length > 6) {
      formatted = formatted.slice(0, 7) + "." + limited.slice(6);
    }
    if (limited.length > 9) {
      formatted = formatted.slice(0, 11) + "-" + limited.slice(9);
    }

    setValue(formatted);

    // Valida apenas quando completo
    if (limited.length === 11) {
      const isValid = validateCPF(limited);
      setError(isValid ? null : "CPF inválido. Verifique os dígitos verificadores.");
    } else if (limited.length > 0) {
      setError(null); // Remove erro enquanto está digitando
    } else {
      setError(null);
    }
  }, []);

  const validate = useCallback((): boolean => {
    const cleaned = normalizeCPF(value);
    if (cleaned.length === 0) {
      setError("CPF é obrigatório");
      return false;
    }
    if (cleaned.length !== 11) {
      setError("CPF deve ter 11 dígitos");
      return false;
    }
    const isValid = validateCPF(cleaned);
    setError(isValid ? null : "CPF inválido. Verifique os dígitos verificadores.");
    return isValid;
  }, [value]);

  const reset = useCallback(() => {
    setValue("");
    setError(null);
  }, []);

  const getNormalizedValue = useCallback((): string => {
    return normalizeCPF(value);
  }, [value]);

  return {
    value,
    error,
    isValid: !error && value.length === 14, // 000.000.000-00 tem 14 caracteres
    handleChange,
    validate,
    reset,
    getNormalizedValue,
  };
}
