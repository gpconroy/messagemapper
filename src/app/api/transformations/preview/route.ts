import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyTransformations } from '@/transformations';
import { auth } from '@/auth';

/**
 * POST /api/transformations/preview
 * Previews transformation results without persisting changes (dry-run mode)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rules, sampleData } = body;

    // Validate request body
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: 'rules must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!sampleData || typeof sampleData !== 'object' || Array.isArray(sampleData)) {
      return NextResponse.json(
        { error: 'sampleData must be an object' },
        { status: 400 }
      );
    }

    // Apply transformations in dry-run mode
    const result = await applyTransformations(
      sampleData,
      rules,
      { prisma },
      { dryRun: true }
    );

    // Return transformation results
    return NextResponse.json({
      data: {
        result: result.result,
        ruleResults: result.ruleResults,
        errors: result.errors,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error previewing transformations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
