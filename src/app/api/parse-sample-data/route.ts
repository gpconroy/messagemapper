import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { flattenToPathMap } from '@/lib/sample-data-extractor'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * POST /api/parse-sample-data
 * Parses an uploaded sample file (JSON or XML) and returns a flat path-to-value map.
 * This endpoint is used by the preview panel to extract values from real sample data.
 */
export async function POST(request: NextRequest) {
  try {
    // Extract file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // Validate file exists
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Read file content
    const content = await file.text()

    // Detect format from file extension
    const fileName = file.name.toLowerCase()
    let parsed: unknown

    try {
      if (fileName.endsWith('.json')) {
        // Parse JSON
        parsed = JSON.parse(content)
      } else if (fileName.endsWith('.xml')) {
        // Parse XML with same config as XmlSampleParser
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          parseAttributeValue: false,
          parseTagValue: false,
          trimValues: true,
          removeNSPrefix: true,
        })
        parsed = parser.parse(content)
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Please upload a .json or .xml file.' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Parse failed: ${error.message}`
              : 'Failed to parse file',
        },
        { status: 400 }
      )
    }

    // Flatten to path-value map
    const values = flattenToPathMap(parsed)

    // Return success response
    return NextResponse.json(
      {
        success: true,
        values,
        fileName: file.name,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in parse-sample-data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
