import { NextRequest, NextResponse } from 'next/server';
import { searchEmployees } from '@/services/vector-search';
import { checkQdrantHealth } from '@/lib/qdrant';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Fallback search using Supabase when Qdrant is unavailable
 */
async function fallbackSearch(query: string, limit: number) {
  const supabase = getSupabaseClient();
  const lowerQuery = query.toLowerCase();

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .or(`name.ilike.%${lowerQuery}%,email.ilike.%${lowerQuery}%`)
    .limit(limit);

  if (error) throw error;

  // Extract role from name if it contains " - "
  return employees?.map((emp, index) => {
    const nameParts = emp.name.split(' - ');
    const displayName = nameParts[0] || emp.name;
    const role = nameParts[1] || '';

    return {
      employee: {
        id: emp.id,
        name: displayName,
        email: emp.email,
        role: role,
        department: '',
        skills: [],
        walletAddress: emp.wallet_address,
      },
      score: 0.8 - (index * 0.05), // Mock scores
      relevance: 'medium' as const,
    };
  }) || [];
}

/**
 * GET /api/employees/search?q=blockchain+developer&limit=10
 * Semantic search for employees using natural language
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const scoreThreshold = parseFloat(searchParams.get('threshold') || '0.5');

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required',
        },
        { status: 400 }
      );
    }

    let results;
    let searchMethod = 'vector';

    // Check if Qdrant is available
    const isHealthy = await checkQdrantHealth();

    if (isHealthy) {
      try {
        // Perform semantic search
        const searchResults = await searchEmployees(query, {
          limit,
          scoreThreshold,
        });

        results = searchResults.map((r) => ({
          employee: {
            id: r.payload.employeeId,
            name: r.payload.name,
            email: r.payload.email,
            role: r.payload.role,
            department: r.payload.department,
            skills: r.payload.skills,
            walletAddress: r.payload.walletAddress,
          },
          score: r.score,
          relevance: r.score > 0.7 ? 'high' : r.score > 0.5 ? 'medium' : 'low',
        }));
      } catch (error) {
        console.warn('Vector search failed, falling back to database search:', error);
        results = await fallbackSearch(query, limit);
        searchMethod = 'fallback';
      }
    } else {
      console.warn('Qdrant unavailable, using fallback search');
      results = await fallbackSearch(query, limit);
      searchMethod = 'fallback';
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      total: results.length,
      metadata: {
        scoreThreshold,
        maxResults: limit,
        searchMethod,
        note: searchMethod === 'fallback' ? 'Using keyword search. For semantic search, configure Qdrant Cloud.' : undefined,
      },
    });
  } catch (error) {
    console.error('Employee search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search employees',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees/search
 * Advanced semantic search with filters
 *
 * Body: {
 *   query: string,
 *   limit?: number,
 *   scoreThreshold?: number,
 *   filters?: { department?: string, role?: string }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, scoreThreshold = 0.5, filters } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required and must be a string',
        },
        { status: 400 }
      );
    }

    let results;
    let searchMethod = 'vector';

    // Check if Qdrant is available
    const isHealthy = await checkQdrantHealth();

    if (isHealthy) {
      try {
        // Perform semantic search
        const searchResults = await searchEmployees(query, {
          limit,
          scoreThreshold,
          filter: filters,
        });

        results = searchResults.map((r) => ({
          employee: {
            id: r.payload.employeeId,
            name: r.payload.name,
            email: r.payload.email,
            role: r.payload.role,
            department: r.payload.department,
            skills: r.payload.skills,
            walletAddress: r.payload.walletAddress,
          },
          score: r.score,
          relevance: r.score > 0.7 ? 'high' : r.score > 0.5 ? 'medium' : 'low',
        }));
      } catch (error) {
        console.warn('Vector search failed, falling back to database search:', error);
        results = await fallbackSearch(query, limit);
        searchMethod = 'fallback';
      }
    } else {
      console.warn('Qdrant unavailable, using fallback search');
      results = await fallbackSearch(query, limit);
      searchMethod = 'fallback';
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      total: results.length,
      metadata: {
        scoreThreshold,
        maxResults: limit,
        filters: filters || {},
        searchMethod,
        note: searchMethod === 'fallback' ? 'Using keyword search. For semantic search, configure Qdrant Cloud.' : undefined,
      },
    });
  } catch (error) {
    console.error('Employee search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search employees',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
