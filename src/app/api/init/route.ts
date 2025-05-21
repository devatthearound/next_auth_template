import { NextResponse } from 'next/server';
import { initializeActivityTypes } from '@/lib/activity';

// 이 엔드포인트는 개발 목적으로만 사용해야 합니다.
// 실제 프로덕션 환경에서는 서버 시작 스크립트에서 초기화하는 것이 좋습니다.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    await initializeActivityTypes();
    
    return NextResponse.json({ message: 'Initialization completed' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Initialization failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Initialization failed" 
    }, { status: 500 });
  }
}