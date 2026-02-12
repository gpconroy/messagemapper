import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/lookup-tables/[id]/entries
 * Returns all entries for a lookup table, ordered by fromValue
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lookupTableId } = await params;

    const entries = await prisma.lookupTableEntry.findMany({
      where: { lookupTableId },
      orderBy: { fromValue: 'asc' }
    });

    return NextResponse.json({ data: entries }, { status: 200 });

  } catch (error) {
    console.error('Error fetching lookup table entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lookup-tables/[id]/entries
 * Creates new lookup table entry or entries (supports single object or array)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lookupTableId } = await params;
    const body = await request.json();

    // Support both single entry and array of entries
    const entries = Array.isArray(body) ? body : [body];

    // Validate all entries
    for (const entry of entries) {
      if (!entry.fromValue || typeof entry.fromValue !== 'string' || entry.fromValue.trim() === '') {
        return NextResponse.json(
          { error: 'Each entry must have a non-empty fromValue string' },
          { status: 400 }
        );
      }
      if (!entry.toValue || typeof entry.toValue !== 'string' || entry.toValue.trim() === '') {
        return NextResponse.json(
          { error: 'Each entry must have a non-empty toValue string' },
          { status: 400 }
        );
      }
    }

    // Create entries
    try {
      const createdEntries = await prisma.$transaction(
        entries.map(entry =>
          prisma.lookupTableEntry.create({
            data: {
              lookupTableId,
              fromValue: entry.fromValue.trim(),
              toValue: entry.toValue.trim()
            }
          })
        )
      );

      return NextResponse.json(
        { data: Array.isArray(body) ? createdEntries : createdEntries[0] },
        { status: 201 }
      );

    } catch (createError: any) {
      // Handle unique constraint violation (duplicate fromValue)
      if (createError.code === 'P2002' && createError.meta?.target?.includes('fromValue')) {
        return NextResponse.json(
          { error: 'An entry with this fromValue already exists in this lookup table' },
          { status: 409 }
        );
      }

      // Handle foreign key constraint (invalid lookupTableId)
      if (createError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid lookup table ID' },
          { status: 400 }
        );
      }

      throw createError;
    }

  } catch (error) {
    console.error('Error creating lookup table entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lookup-tables/[id]/entries
 * Updates an existing lookup table entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params even if not using the id from params
    const body = await request.json();
    const { id: entryId, fromValue, toValue } = body;

    // Validate required fields
    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry id is required' },
        { status: 400 }
      );
    }

    if (!fromValue || typeof fromValue !== 'string' || fromValue.trim() === '') {
      return NextResponse.json(
        { error: 'fromValue is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!toValue || typeof toValue !== 'string' || toValue.trim() === '') {
      return NextResponse.json(
        { error: 'toValue is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Update entry
    try {
      const updatedEntry = await prisma.lookupTableEntry.update({
        where: { id: entryId },
        data: {
          fromValue: fromValue.trim(),
          toValue: toValue.trim()
        }
      });

      return NextResponse.json({ data: updatedEntry }, { status: 200 });

    } catch (updateError: any) {
      // Handle not found
      if (updateError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Lookup table entry not found' },
          { status: 404 }
        );
      }

      // Handle unique constraint violation (duplicate fromValue)
      if (updateError.code === 'P2002' && updateError.meta?.target?.includes('fromValue')) {
        return NextResponse.json(
          { error: 'An entry with this fromValue already exists in this lookup table' },
          { status: 409 }
        );
      }

      throw updateError;
    }

  } catch (error) {
    console.error('Error updating lookup table entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lookup-tables/[id]/entries?entryId={id}
 * Deletes a lookup table entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Await params even if not using the id from params
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json(
        { error: 'entryId query parameter is required' },
        { status: 400 }
      );
    }

    try {
      await prisma.lookupTableEntry.delete({
        where: { id: entryId }
      });

      return NextResponse.json(
        { data: { message: 'Entry deleted successfully' } },
        { status: 200 }
      );

    } catch (deleteError: any) {
      // Handle not found
      if (deleteError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Lookup table entry not found' },
          { status: 404 }
        );
      }

      throw deleteError;
    }

  } catch (error) {
    console.error('Error deleting lookup table entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
