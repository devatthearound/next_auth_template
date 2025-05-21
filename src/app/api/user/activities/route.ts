import { NextRequest, NextResponse } from 'next/server';
import { getUserActivities } from '@/lib/activity';
import { getUserIdFromRequest } from '@/utils/request-utils';
import { z } from 'zod';

// 유효성 검사 스키마 수정
const getActivitiesSchema = z.object({
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  startDate: z.string().optional().nullable(), // nullable() 추가
  endDate: z.string().optional().nullable(),   // nullable() 추가
  activityCodes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    // URL 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityCodes = searchParams.get('activityCodes') 
      ? searchParams.get('activityCodes')!.split(',')
      : undefined;
    
    // 파라미터 유효성 검사
    try {
      getActivitiesSchema.parse({
        limit,
        offset,
        startDate,
        endDate,
        activityCodes,
      });
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 사용자 활동 이력 조회
    const result = await getUserActivities(userId, {
      limit,
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      activityCodes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to fetch activities" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to fetch activities" 
    }, { status: 500 });
  }
}