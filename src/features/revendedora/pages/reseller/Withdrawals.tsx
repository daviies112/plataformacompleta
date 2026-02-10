import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Withdrawals() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/revendedora/reseller/financial', { replace: true });
  }, [navigate]);

  return null;
}
