
// src/app/api/s3/delete/route.ts - S3 파일 삭제

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { getS3Service } from '@/lib/s3/s3.service';
import { logUserActivity } from '@/lib/activity';
import { z } from 'zod';

const deleteSchema = z.object({
  key: z.string().min(1, 'S3 key is required'),
});

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      deleteSchema.parse(body);
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid request data" 
      }, { status: 400 });
    }

    const { key } = body;
    
    const s3Service = getS3Service();
    await s3Service.deleteFile(key);

    // 활동 로그 기록
    const context = getRequestContext(request);
    await logUserActivity(
      userId, 
      'S3_FILE_DELETED', 
      { s3Key: key }, 
      context
    );

    return NextResponse.json({
      message: "File deleted successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error('S3 delete error:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to delete file from S3" 
    }, { status: 500 });
  }
}