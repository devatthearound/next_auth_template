# 🔔 FCM 푸시 알림 시스템 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [Firebase 설정](#firebase-설정)
3. [환경변수 설정](#환경변수-설정)
4. [API 엔드포인트](#api-엔드포인트)
5. [사용 예제](#사용-예제)
6. [문제 해결](#문제-해결)

## 🎯 시스템 개요

### 기능
- **단일 사용자 알림**: 특정 사용자에게 알림 발송
- **전체 브로드캐스트**: 모든 사용자에게 일괄 알림 발송
- **사용자 유형별 알림**: CUSTOMER 또는 OWNER 그룹에게 발송
- **알림 통계**: 활성 토큰 수, 사용자 현황 등 조회
- **테스트 알림**: 간단한 테스트 알림 발송

### 지원 플랫폼
- **Android**: FCM native
- **iOS**: APNs via FCM
- **Web**: WebPush via FCM

## 🔥 Firebase 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. 프로젝트 설정 → 서비스 계정 탭
4. "새 비공개 키 생성" 클릭
5. JSON 파일 다운로드 및 안전한 곳에 보관

### 2. Firebase 서비스 계정 키
다운로드한 JSON 파일의 내용을 환경변수로 설정해야 합니다.

## ⚙️ 환경변수 설정

`.env.local` 파일에 다음 환경변수들을 추가하세요:

```bash
# Firebase 설정 (옵션 1: JSON 전체)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# Firebase 설정 (옵션 2: 개별 필드)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 환경변수 설정 방법

#### 🔐 옵션 1: JSON 전체 (권장)
Firebase에서 다운로드한 JSON 파일 내용을 한 줄로 변환:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"}'
```

#### 🔧 옵션 2: 개별 필드
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 📡 API 엔드포인트

### 1. 알림 발송
```http
POST /api/notifications/send
```

**Headers:**
```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "알림 제목",
  "body": "알림 내용",
  "imageUrl": "https://example.com/image.jpg",
  "clickAction": "/dashboard",
  "data": {
    "customKey": "customValue"
  },
  "targetType": "single|all|userType",
  "targetUserId": "user_id_here",
  "targetUserType": "CUSTOMER|OWNER",
  "priority": "high|normal",
  "timeToLive": 3600,
  "collapseKey": "notification_group"
}
```

### 2. 알림 통계 조회
```http
GET /api/notifications/stats
```

**Response:**
```json
{
  "success": true,
  "message": "알림 통계 조회 완료",
  "stats": {
    "totalActiveTokens": 150,
    "totalUsers": 100,
    "customerTokens": 120,
    "ownerTokens": 30
  }
}
```

### 3. 테스트 알림
```http
POST /api/notifications/test
```

**Response:**
```json
{
  "success": true,
  "message": "테스트 알림 발송 완료",
  "result": {
    "targetUserId": "user_id",
    "successCount": 1,
    "failureCount": 0
  }
}
```

## 🚀 사용 예제

### JavaScript/TypeScript 클라이언트

```javascript
// 1. 테스트 알림 발송
async function sendTestNotification() {
  const response = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const result = await response.json();
  console.log('테스트 결과:', result);
}

// 2. 전체 사용자에게 알림 발송
async function sendBroadcastNotification() {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: "📢 중요 공지",
      body: "새로운 업데이트가 출시되었습니다!",
      targetType: "all",
      priority: "high",
      clickAction: "/updates",
      data: {
        type: "announcement",
        version: "2.0.0"
      }
    }),
  });
  
  const result = await response.json();
  console.log('전체 알림 결과:', result);
}

// 3. 특정 사용자에게 알림 발송
async function sendPersonalNotification(userId) {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: "개인 알림",
      body: "새로운 메시지가 도착했습니다",
      targetType: "single",
      targetUserId: userId,
      priority: "normal",
      data: {
        type: "message",
        messageId: "123"
      }
    }),
  });
  
  const result = await response.json();
  console.log('개인 알림 결과:', result);
}

// 4. 고객에게만 알림 발송
async function sendCustomerNotification() {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: "고객 전용 혜택",
      body: "특별 할인 이벤트를 확인하세요!",
      targetType: "userType",
      targetUserType: "CUSTOMER",
      priority: "normal",
      clickAction: "/events",
      data: {
        type: "promotion",
        eventId: "summer2024"
      }
    }),
  });
  
  const result = await response.json();
  console.log('고객 알림 결과:', result);
}

// 5. 알림 통계 조회
async function getNotificationStats() {
  const response = await fetch('/api/notifications/stats', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const result = await response.json();
  console.log('알림 통계:', result.stats);
}
```

### cURL 예제

```bash
# 테스트 알림 발송
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# 전체 알림 발송
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "전체 공지",
    "body": "중요한 업데이트가 있습니다",
    "targetType": "all",
    "priority": "high"
  }'

# 알림 통계 조회
curl -X GET http://localhost:3000/api/notifications/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔧 문제 해결

### 1. Firebase 인증 오류
```
Error: Failed to initialize Firebase Admin SDK
```

**해결 방법:**
- 환경변수가 올바르게 설정되었는지 확인
- JSON 형식이 유효한지 확인
- Private key에서 `\n`이 실제 줄바꿈으로 변환되는지 확인

### 2. FCM 토큰 없음
```
⚠️ 사용자의 활성 FCM 토큰이 없음
```

**해결 방법:**
- 사용자가 앱에서 FCM 토큰을 등록했는지 확인
- 토큰이 만료되지 않았는지 확인
- 디바이스에서 알림 권한이 허용되었는지 확인

### 3. 권한 오류
```
권한이 없습니다. OWNER만 알림을 발송할 수 있습니다
```

**해결 방법:**
- 로그인한 사용자가 OWNER 권한을 가지고 있는지 확인
- JWT 토큰이 유효한지 확인

### 4. 만료된 토큰 자동 정리
시스템이 자동으로 만료된 FCM 토큰을 감지하고 비활성화합니다:

```
🗑️ 만료된 FCM 토큰 비활성화: fcm_token_here...
```

이는 정상적인 동작이며, 더 이상 유효하지 않은 토큰을 정리하는 과정입니다.

## 📊 모니터링

### 로그 확인
```bash
# 개발 서버 로그에서 FCM 관련 로그 확인
✅ FCM 메시지 발송 성공: projects/your-project/messages/1234567890
📱 사용자 user_id에게 알림 발송: 성공 1, 실패 0
📢 전체 알림 발송 시작: 50명의 사용자, 75개의 토큰
🎯 전체 알림 발송 완료: 성공 70, 실패 5
```

### 통계 활용
정기적으로 `/api/notifications/stats` 엔드포인트를 호출하여:
- 활성 토큰 수 모니터링
- 사용자 증가 추이 파악
- 플랫폼별 사용자 분포 확인

이제 FCM 푸시 알림 시스템이 완전히 준비되었습니다! 🎉 