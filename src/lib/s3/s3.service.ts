// src/lib/s3/s3.service.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface UploadedFileInfo {
  url: string;
  key: string;
  size: number;
  type: string;
  originalName: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS S3 configuration is incomplete. Please check your environment variables.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    
    this.bucket = bucketName;
  }

  async uploadFile(file: File, folder: string): Promise<UploadedFileInfo> {
    const extension = file.name.split('.').pop() || '';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const key = `${folder}/${timestamp}-${randomString}.${extension}`;

    console.log('S3 업로드 정보:', {
      originalName: file.name,
      extension,
      timestamp,
      key,
      mimetype: file.type,
      size: file.size,
    });

    try {
      // File을 ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // 옵션: 캐시 설정
        CacheControl: 'max-age=31536000', // 1년
        // 옵션: 메타데이터 추가
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return {
        url,
        key,
        size: file.size,
        type: file.type,
        originalName: file.name,
      };
    } catch (error) {
      console.error('S3 업로드 실패:', error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  async uploadMultipleFiles(
    files: File[], 
    folder: string
  ): Promise<UploadedFileInfo[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`S3 파일 삭제 성공: ${key}`);
    } catch (error) {
      console.error('S3 파일 삭제 실패:', error);
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }

  // 특정 폴더의 모든 파일 삭제
  async deleteFolder(folderPrefix: string): Promise<void> {
    // 실제 구현시에는 ListObjectsV2Command를 사용하여 파일 목록을 가져온 후 삭제
    // 여기서는 간단한 예시만 제공
    console.log(`Deleting folder: ${folderPrefix}`);
  }

  // URL에서 S3 키 추출하는 헬퍼 메서드
  extractKeyFromUrl(url: string): string {
    const bucketUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return url.replace(bucketUrl, '');
  }
}

// 싱글톤 인스턴스
let s3ServiceInstance: S3Service | null = null;

export function getS3Service(): S3Service {
  if (!s3ServiceInstance) {
    s3ServiceInstance = new S3Service();
  }
  return s3ServiceInstance;
}