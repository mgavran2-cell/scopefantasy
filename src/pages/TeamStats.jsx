import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TeamStats() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/premium#team-stats', { replace: true });
  }, []);
  return null;
}