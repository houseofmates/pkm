import { useParams } from 'react-router-dom';
import { DashboardGrid } from '@/features/dashboard/dashboard-grid';

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  return <DashboardGrid layoutKey={`layout_${id}`} />;
}
