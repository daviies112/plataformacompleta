import { createContext, useContext, useState, ReactNode } from 'react';

export interface GovBRData {
  cpf: string;
  nome: string;
  nivel_conta: string;
  email?: string;
  authenticated: boolean;
}

export interface ContractData {
  id?: string;
  protocol_number?: string;
  signed_at?: string;
  contract_html?: string;
}

export interface AddressData {
  street: string;
  number: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipcode: string;
  complement?: string;
}

interface ContractContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  govbrData: GovBRData | null;
  setGovbrData: (data: GovBRData | null) => void;
  contractData: ContractData | null;
  setContractData: (data: ContractData | null) => void;
  addressData: AddressData | null;
  setAddressData: (data: AddressData | null) => void;
  residenceProofPhoto: string | null;
  setResidenceProofPhoto: (photo: string | null) => void;
  residenceProofValidated: boolean;
  setResidenceProofValidated: (validated: boolean) => void;
  resetFlow: () => void;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [govbrData, setGovbrData] = useState<GovBRData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [residenceProofPhoto, setResidenceProofPhoto] = useState<string | null>(null);
  const [residenceProofValidated, setResidenceProofValidated] = useState(false);

  const resetFlow = () => {
    setCurrentStep(0);
    setGovbrData(null);
    setContractData(null);
    setAddressData(null);
    setResidenceProofPhoto(null);
    setResidenceProofValidated(false);
  };

  return (
    <ContractContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        govbrData,
        setGovbrData,
        contractData,
        setContractData,
        addressData,
        setAddressData,
        residenceProofPhoto,
        setResidenceProofPhoto,
        residenceProofValidated,
        setResidenceProofValidated,
        resetFlow,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error('useContract must be used within a ContractProvider');
  }
  return context;
};
