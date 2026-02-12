import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hardcoded dev tenant ID for now (auth not yet built)
// This will be replaced with actual session-based tenant ID in Phase 7
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/lookup-tables?tenantId={id}
 * Returns all lookup tables for a tenant with entry counts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || DEV_TENANT_ID;

    const tables = await prisma.lookupTable.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform to include entryCount
    const tablesWithCount = tables.map(table => ({
      id: table.id,
      name: table.name,
      description: table.description,
      tenantId: table.tenantId,
      entryCount: table._count.entries,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    }));

    return NextResponse.json({ data: tablesWithCount }, { status: 200 });

  } catch (error) {
    console.error('Error fetching lookup tables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lookup-tables
 * Creates a new lookup table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, tenantId } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Use provided tenantId or fallback to dev tenant
    const finalTenantId = tenantId || DEV_TENANT_ID;

    // Create lookup table
    try {
      const table = await prisma.lookupTable.create({
        data: {
          name: name.trim(),
          description: description || null,
          tenantId: finalTenantId
        }
      });

      return NextResponse.json({ data: table }, { status: 201 });

    } catch (createError: any) {
      // Handle unique constraint violation (duplicate name for tenant)
      if (createError.code === 'P2002' && createError.meta?.target?.includes('name')) {
        return NextResponse.json(
          { error: `A lookup table named "${name}" already exists for this tenant` },
          { status: 409 }
        );
      }

      // Handle foreign key constraint (invalid tenantId)
      if (createError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid tenantId: tenant does not exist' },
          { status: 400 }
        );
      }

      throw createError;
    }

  } catch (error) {
    console.error('Error creating lookup table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
