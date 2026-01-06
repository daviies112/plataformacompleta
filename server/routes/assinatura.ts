import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const router = Router();

interface AssinaturaContract {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone?: string | null;
  status?: string | null;
  access_token?: string | null;
  created_at?: string;
  signed_at?: string | null;
  protocol_number?: string | null;
  contract_html?: string | null;
  logo_url?: string | null;
  logo_size?: string | null;
  logo_position?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  font_size?: string | null;
  company_name?: string | null;
  footer_text?: string | null;
  maleta_card_color?: string | null;
  maleta_button_color?: string | null;
  maleta_text_color?: string | null;
  verification_primary_color?: string | null;
  verification_text_color?: string | null;
  verification_font_family?: string | null;
  verification_font_size?: string | null;
  verification_logo_url?: string | null;
  verification_logo_size?: string | null;
  verification_logo_position?: string | null;
  verification_footer_text?: string | null;
  verification_welcome_text?: string | null;
  verification_instructions?: string | null;
  verification_security_text?: string | null;
  verification_background_color?: string | null;
  verification_header_background_color?: string | null;
  verification_header_company_name?: string | null;
  progress_card_color?: string | null;
  progress_button_color?: string | null;
  progress_text_color?: string | null;
  progress_title?: string | null;
  progress_subtitle?: string | null;
  progress_step1_title?: string | null;
  progress_step1_description?: string | null;
  progress_step2_title?: string | null;
  progress_step2_description?: string | null;
  progress_step3_title?: string | null;
  progress_step3_description?: string | null;
  progress_button_text?: string | null;
  progress_font_family?: string | null;
  app_store_url?: string | null;
  google_play_url?: string | null;
  parabens_title?: string | null;
  parabens_subtitle?: string | null;
  parabens_description?: string | null;
  parabens_card_color?: string | null;
  parabens_background_color?: string | null;
  parabens_button_color?: string | null;
  parabens_text_color?: string | null;
  parabens_font_family?: string | null;
  parabens_form_title?: string | null;
  parabens_button_text?: string | null;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  } | null;
}

const contractsStore = new Map<string, AssinaturaContract>();

router.get('/contracts', (req: Request, res: Response) => {
  try {
    const contracts = Array.from(contractsStore.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.get('/contracts/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const contract = Array.from(contractsStore.values()).find(
      (c) => c.access_token === token
    );

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

router.post('/contracts', (req: Request, res: Response) => {
  try {
    const {
      client_name,
      client_cpf,
      client_email,
      client_phone,
      contract_html,
      protocol_number,
      status,
      ...customizations
    } = req.body;

    if (!client_name || !client_cpf || !client_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = nanoid();
    const access_token = nanoid(32);

    const contract: AssinaturaContract = {
      id,
      client_name,
      client_cpf,
      client_email,
      client_phone: client_phone || null,
      contract_html: contract_html || null,
      protocol_number: protocol_number || `CONT-${Date.now()}`,
      status: status || 'pending',
      access_token,
      created_at: new Date().toISOString(),
      signed_at: null,
      ...customizations
    };

    contractsStore.set(id, contract);

    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

router.patch('/contracts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contract = contractsStore.get(id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const updatedContract = { ...contract, ...updates };
    contractsStore.set(id, updatedContract);

    res.json(updatedContract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

router.post('/contracts/:id/finalize', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    const contract = contractsStore.get(id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status === 'signed') {
      return res.status(400).json({ error: 'Contract already signed' });
    }

    const updatedContract: AssinaturaContract = {
      ...contract,
      status: 'signed',
      signed_at: new Date().toISOString(),
      address: address || null
    };

    contractsStore.set(id, updatedContract);

    res.json(updatedContract);
  } catch (error) {
    console.error('Error finalizing contract:', error);
    res.status(500).json({ error: 'Failed to finalize contract' });
  }
});

router.delete('/contracts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!contractsStore.has(id)) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    contractsStore.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

export default router;
