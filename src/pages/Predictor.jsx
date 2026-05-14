import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Predictor() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/premium#ai-analiza', { replace: true });
  }, []);
  return null;
}