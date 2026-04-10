import { CitizensExplorer } from '@/components/CitizensExplorer';
import { EMPTY_PAYLOAD } from '@/lib/types';

export default function HomePage() {
  return <CitizensExplorer data={EMPTY_PAYLOAD} />;
}
