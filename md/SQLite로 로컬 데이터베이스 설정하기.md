Next.js 프로젝트에서 로컬 데이터베이스를 사용하기 위한 방법을 안내해 드리겠습니다. 가장 간단한 방법은 SQLite를 사용하는 것입니다. 다음은 로컬 데이터베이스 설정 단계입니다:

## SQLite로 로컬 데이터베이스 설정하기

### 1. schema.prisma 파일 수정

`prisma/schema.prisma` 파일에서 데이터베이스 provider를 SQLite로 변경합니다:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// 모델 정의...
```

이렇게 하면 프로젝트의 prisma 폴더에 `dev.db` 파일이 생성됩니다.

### 2. 마이그레이션 실행

```bash
npx prisma migrate dev --name init
```

### 3. 데이터베이스 확인 (선택사항)

```bash
npx prisma studio
```

이 명령어를 실행하면 `http://localhost:5555`에서 데이터베이스 내용을 확인하고 관리할 수 있습니다.

## PostgreSQL 또는 MySQL을 로컬에서 사용하려면

Docker를 사용하면 로컬에서도 PostgreSQL이나 MySQL과 같은 데이터베이스를 쉽게 실행할 수 있습니다.

### PostgreSQL 예시:

1. Docker Compose 파일 생성 (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    restart: always
    environment:
      - POSTGRES_USER=myuser
      - POSTGRES_PASSWORD=mypassword
      - POSTGRES_DB=mydb
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2. Docker Compose 실행:

```bash
docker-compose up -d
```

3. `.env` 파일에 데이터베이스 URL 설정:

```
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
```

4. schema.prisma 파일 수정:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

5. 마이그레이션 실행:

```bash
npx prisma migrate dev --name init
```

## MySQL 예시:

1. Docker Compose 파일 생성 (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  db:
    image: mysql:8
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=mydb
      - MYSQL_USER=myuser
      - MYSQL_PASSWORD=mypassword
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

2. Docker Compose 실행:

```bash
docker-compose up -d
```

3. `.env` 파일에 데이터베이스 URL 설정:

```
DATABASE_URL="mysql://myuser:mypassword@localhost:3306/mydb"
```

4. schema.prisma 파일 수정:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

5. 마이그레이션 실행:

```bash
npx prisma migrate dev --name init
```

로컬 개발 환경에서는 SQLite가 가장 간단하고 설정이 필요 없는 옵션이지만, 실제 프로덕션 환경과 동일한 데이터베이스를 사용하고 싶다면 Docker를 통해 PostgreSQL이나 MySQL을 실행하는 것이 좋습니다.