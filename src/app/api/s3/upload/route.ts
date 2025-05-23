// src/app/api/s3/upload/route.ts - 단일 파일 S3 업로드

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { getS3Service } from '@/lib/s3/s3.service';
import { logUserActivity } from '@/lib/activity';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;
    
    if (!file) {
      return NextResponse.json({ 
        error: "No file provided" 
      }, { status: 400 });
    }

    if (!folder) {
      return NextResponse.json({ 
        error: "Folder path is required" 
      }, { status: 400 });
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File size must be less than 10MB" 
      }, { status: 400 });
    }

    const s3Service = getS3Service();
    const result = await s3Service.uploadFile(file, folder);

    // 활동 로그 기록
    const context = getRequestContext(request);
    await logUserActivity(
      userId, 
      'S3_FILE_UPLOADED', 
      { 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        folder: folder,
        s3Key: result.key
      }, 
      context
    );

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('S3 upload error:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to upload file to S3" 
    }, { status: 500 });
  }
}
