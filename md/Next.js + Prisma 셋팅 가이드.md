# Next.js + Prisma 셋팅 가이드

Next.js와 Prisma를 함께 설정하는 방법을 단계별로 안내해 드리겠습니다.

## 1단계: Next.js 프로젝트 생성

```bash
npx create-next-app@latest my-nextjs-prisma-app
cd my-nextjs-prisma-app
```

프로젝트 생성 시 나오는 질문에 답하세요. TypeScript를 사용하는 것을 권장합니다.

## 2단계: Prisma 설치

```bash
npm install prisma --save-dev
npm install @prisma/client
```

## 3단계: Prisma 초기화

```bash
npx prisma init
```

이 명령어를 실행하면 다음과 같은 파일들이 생성됩니다:
- `prisma/schema.prisma` - 데이터베이스 스키마 정의 파일
- `.env` - 환경 변수 파일 (데이터베이스 연결 정보 포함)

## 4단계: 데이터베이스 연결 설정

`.env` 파일에서 DATABASE_URL을 설정하세요. 예를 들어 PostgreSQL을 사용한다면:

```
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"
```

## 5단계: Prisma 스키마 정의

`prisma/schema.prisma` 파일을 열고 데이터베이스 provider와 모델을 정의하세요:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // 또는 mysql, sqlite, sqlserver, mongodb 등
  url      = env("DATABASE_URL")
}

// 모델 예시
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 6단계: Prisma Client 생성 및 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name init
```

이 명령어는:
1. 데이터베이스 테이블을 생성하는 SQL 마이그레이션 파일을 생성합니다.
2. 마이그레이션을 데이터베이스에 적용합니다.
3. Prisma Client를 생성합니다.

## 7단계: Prisma Client 인스턴스 생성

`src/lib/prisma.ts` 파일을 생성하여 Prisma Client 인스턴스를 관리하세요:

```typescript
import { PrismaClient } from '@prisma/client';

// PrismaClient는 전역 변수로 선언하고 한 번만 인스턴스화합니다
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## 8단계: API 라우트에서 Prisma 사용하기

API 라우트에서 Prisma Client를 사용하는 예시를 만들어 보겠습니다.

`app/api/users/route.ts` 파일 생성:

```typescript
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## 9단계: 서버 컴포넌트에서 Prisma 사용하기

Next.js 13+ 서버 컴포넌트에서 Prisma를 사용하는 예시:

`app/users/page.tsx` 파일 생성:

```typescript
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 10단계: Prisma Studio 사용하기 (선택사항)

데이터베이스 내용을 시각적으로 확인하고 편집할 수 있는 GUI 도구를 실행하려면:

```bash
npx prisma studio
```

이렇게 하면 `http://localhost:5555`에서 Prisma Studio가 실행됩니다.

이제 Next.js와 Prisma가 함께 설정되었습니다! 필요에 따라 더 많은 모델과 관계를 정의하고, API 라우트를 추가하고, 서버 컴포넌트에서 데이터를 가져올 수 있습니다.