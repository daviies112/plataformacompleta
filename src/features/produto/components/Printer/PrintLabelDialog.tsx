/**
 * @deprecated This component is deprecated. Use LabelConfigDialog instead.
 * This file re-exports LabelConfigDialog for backward compatibility.
 */
import { LabelConfigDialog } from "./LabelConfigDialog";
import type { Product, PrinterSettings } from "@/features/produto/pages/ProdutoPage";

interface PrintLabelDialogProps {
  product: Product;
  printerSettings?: PrinterSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * @deprecated Use LabelConfigDialog instead.
 * This component is kept for backward compatibility only.
 */
export const PrintLabelDialog = ({ 
  product, 
  printerSettings, 
  open, 
  onOpenChange 
}: PrintLabelDialogProps) => {
  return (
    <LabelConfigDialog
      product={product}
      printerSettings={printerSettings}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};

export default PrintLabelDialog;
