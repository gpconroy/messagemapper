import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Valid transformation types
const TRANSFORMATION_TYPES = [
  'direct',
  'format_date',
  'format_number',
  'split',
  'concatenate',
  'conditional',
  'lookup',
  'constant',
  'custom_js'
] as const;

type TransformationType = typeof TRANSFORMATION_TYPES[number];

/**
 * GET /api/transformations?mappingConfigId={id}
 * Returns all transformation rules for a mapping, ordered by execution order
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingConfigId = searchParams.get('mappingConfigId');

    if (!mappingConfigId) {
      return NextResponse.json(
        { error: 'mappingConfigId query parameter is required' },
        { status: 400 }
      );
    }

    const rules = await prisma.transformationRule.findMany({
      where: { mappingConfigId },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ data: rules }, { status: 200 });

  } catch (error) {
    console.error('Error fetching transformation rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transformations
 * Creates a new transformation rule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mappingConfigId, type, sourceFields, targetField, config, order, label } = body;

    // Validate required fields
    if (!mappingConfigId || !type || !sourceFields || !targetField || config === undefined || order === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: mappingConfigId, type, sourceFields, targetField, config, order' },
        { status: 400 }
      );
    }

    // Validate type
    if (!TRANSFORMATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid transformation type. Must be one of: ${TRANSFORMATION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate sourceFields is array
    if (!Array.isArray(sourceFields) || sourceFields.length === 0) {
      return NextResponse.json(
        { error: 'sourceFields must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate targetField is string
    if (typeof targetField !== 'string' || targetField.trim() === '') {
      return NextResponse.json(
        { error: 'targetField must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate order is non-negative integer
    if (typeof order !== 'number' || order < 0 || !Number.isInteger(order)) {
      return NextResponse.json(
        { error: 'order must be a non-negative integer' },
        { status: 400 }
      );
    }

    // Create transformation rule
    const rule = await prisma.transformationRule.create({
      data: {
        mappingConfigId,
        type,
        sourceFields,
        targetField,
        config,
        order,
        label: label || null
      }
    });

    return NextResponse.json({ data: rule }, { status: 201 });

  } catch (error) {
    console.error('Error creating transformation rule:', error);

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid mappingConfigId: mapping configuration does not exist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
