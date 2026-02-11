import { NextRequest, NextResponse } from 'next/server';
import { parserRegistry } from '@/lib/parsers';
import type { ParserResult, ParserType } from '@/types/parser-types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // Extract file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Optional format override
    const formatOverride = formData.get('format') as string | null;

    // Parse using registry
    let result: ParserResult;
    try {
      if (formatOverride) {
        const parser = parserRegistry.getParser(formatOverride as ParserType);
        const validation = await parser.validate(content);
        if (!validation.valid) {
          result = {
            success: false,
            fieldNodes: [],
            errors: validation.errors,
            parserType: formatOverride as ParserType
          };
        } else {
          const fieldNodes = await parser.parse(content);
          result = {
            success: true,
            fieldNodes,
            errors: [],
            parserType: formatOverride as ParserType
          };
        }
      } else {
        result = await parserRegistry.parseFile(content, file.name);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Parse failed' },
        { status: 400 }
      );
    }

    // Return result
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in parse-schema API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
