#!/usr/bin/env node
/**
 * Auditoría proveedor IA — Creamy V2
 */
import { probeAIProvider, getActiveProviderName } from '../backend/creamy-v2/lib/ai/provider.js';

async function main() {
  const provider = getActiveProviderName();
  console.log(`\nProveedor activo: ${provider}\n`);
  const report = await probeAIProvider(provider);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n${report.diagnosis}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
