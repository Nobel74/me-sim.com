import { NextResponse } from 'next/server';
import { getDiagnosticLogs } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = getDiagnosticLogs();
  return NextResponse.json({
    success: true,
    total: logs.length,
    timestamp: new Date().toISOString(),
    logs,
  });
}
