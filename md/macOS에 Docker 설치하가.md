Docker가 설치되어 있지 않거나 Docker Compose가 설치되어 있지 않은 것 같습니다. macOS에서 Docker를 설치하는 방법을 안내해 드리겠습니다.

## macOS에 Docker 설치하기

### 1. Docker Desktop 설치
Docker Desktop은 Docker와 Docker Compose를 모두 포함합니다.

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)에서 설치 파일을 다운로드합니다.
2. 다운로드한 `.dmg` 파일을 더블 클릭하여 설치합니다.
3. Applications 폴더로 Docker.app을 드래그합니다.
4. Applications 폴더에서 Docker를 실행합니다.
5. 상태 표시줄에 Docker 아이콘이 나타나면 설치가 완료된 것입니다.

### 2. Homebrew를 통한 설치 (대안)
Homebrew가 설치되어 있다면 다음 명령어로 Docker를 설치할 수도 있습니다:

```bash
brew install --cask docker
```

Docker Desktop이 설치되면 Docker 및 Docker Compose 명령어를 사용할 수 있게 됩니다.

## 설치 확인

설치가 완료되면 터미널에서 다음 명령어로 Docker와 Docker Compose가 제대로 설치되었는지 확인할 수 있습니다:

```bash
docker --version
docker-compose --version
```

## Docker 없이 PostgreSQL 직접 설치하기

Docker를 설치하기 어려운 경우, macOS에 직접 PostgreSQL을 설치할 수 있습니다:

### Homebrew를 사용한 PostgreSQL 설치
```bash
brew install postgresql@14
brew services start postgresql@14
```

### PostgreSQL 데이터베이스 설정
```bash
psql postgres
```

PostgreSQL 명령창에서:
```sql
CREATE DATABASE mydb;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
\q
```

그런 다음 Prisma 설정에서:
```
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
```

이렇게 하면 Docker 없이도 로컬에서 PostgreSQL을 사용할 수 있습니다.