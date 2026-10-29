'use client';
import { use } from 'react';
import SimulationRunner from '@/components/simulations/SimulationRunner';

export default function SimulationPage({ params }: { params: Promise<{ simulationId: string }> }) {
  const { simulationId } = use(params);
  return <SimulationRunner simulationId={simulationId} />;
}
