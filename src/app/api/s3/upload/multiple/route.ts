
// src/app/api/s3/upload/multiple/route.ts - 다중 파일 S3 업로드

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
    const folder = formData.get('folder') as string;
    
    if (!folder) {
      return NextResponse.json({ 
        error: "Folder path is required" 
      }, { status: 400 });
    }

    // FormData에서 모든 파일 추출
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('files[') && value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json({ 
        error: "No files provided" 
      }, { status: 400 });
    }

    // 파일 크기 제한 (각 파일 10MB)
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 10MB.` 
        }, { status: 400 });
      }
    }

    const s3Service = getS3Service();
    const results = await s3Service.uploadMultipleFiles(files, folder);

    // 활동 로그 기록
    const context = getRequestContext(request);
    await logUserActivity(
      userId, 
      'S3_MULTIPLE_FILES_UPLOADED', 
      { 
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        folder: folder,
        fileNames: files.map(f => f.name)
      }, 
      context
    );

    return NextResponse.json({
      message: `${files.length} files uploaded successfully`,
      files: results
    }, { status: 200 });

  } catch (error: any) {
    console.error('S3 multiple upload error:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to upload files to S3" 
    }, { status: 500 });
  }
}
