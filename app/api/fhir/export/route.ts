import { NextResponse } from 'next/server';

export async function GET(){
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: { resourceType: 'Observation', id: 'keystroke-dwell', code: { text: 'Keystroke Dwell Mean' }, valueQuantity: { value: 112, unit: 'ms' } } },
      { resource: { resourceType: 'Observation', id: 'voice-jitter', code: { text: 'Voice Jitter' }, valueQuantity: { value: 0.9, unit: '%' } } }
    ]
  };
  return NextResponse.json(bundle);
}
