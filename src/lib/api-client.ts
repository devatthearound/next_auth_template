// src/lib/api-client.ts

interface ApiClientOptions {
  accessToken?: string;
  refreshCsrfToken?: () => Promise<void>;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipCsrf?: boolean;
}

export class ApiClient {
  private accessToken?: string;
  private refreshCsrfToken?: () => Promise<void>;
  private baseUrl: string;

  constructor(options: ApiClientOptions = {}) {
    this.accessToken = options.accessToken;
    this.refreshCsrfToken = options.refreshCsrfToken;
    this.baseUrl = '/api';
  }

  // CSRF 토큰 가져오기
  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  // 기본 헤더 생성
  private async getHeaders(options: RequestOptions = {}, body?: any): Promise<HeadersInit> {
    const headers: HeadersInit = {};

    // FormData가 아닌 경우에만 Content-Type 설정
    if (!(body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    // 인증 헤더 추가 (skipAuth가 true가 아닌 경우)
    if (!options.skipAuth && this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // CSRF 토큰 추가 (POST, PUT, DELETE, PATCH 요청이고 skipCsrf가 true가 아닌 경우)
    const method = options.method?.toUpperCase() || 'GET';
    if (!options.skipCsrf && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // CSRF 토큰 새로고침
      if (this.refreshCsrfToken) {
        await this.refreshCsrfToken();
      }
      
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        (headers as Record<string, string>)['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    return headers;
  }

  // 공통 fetch 메서드
  async fetch(url: string, options: RequestOptions = {}): Promise<Response> {
    const { skipAuth, skipCsrf, headers: customHeaders, body, ...fetchOptions } = options;
    
    // FormData 디버깅
    if (body instanceof FormData) {
      console.log('=== ApiClient FormData Debug ===');
      console.log('FormData entries:');
      for (const [key, value] of body.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, `File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}:`, value);
        }
      }
      console.log('=== End ApiClient FormData Debug ===');
    }
    
    const defaultHeaders = await this.getHeaders({ skipAuth, skipCsrf, method: options.method }, body);
    
    const mergedHeaders = {
      ...defaultHeaders,
      ...customHeaders,
    };

    console.log('Final request headers:', mergedHeaders);
    console.log('Request URL:', url);
    console.log('Request method:', options.method || 'GET');

    return fetch(this.baseUrl + url, {
      ...fetchOptions,
      body,
      headers: mergedHeaders,
      credentials: 'include', // 쿠키 포함
    });
  }

  // POST 요청
  async post(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<Response> {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body,
    });
  }

  // PUT 요청
  async put(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<Response> {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  // PATCH 요청
  async patch(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<Response> {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    
    return this.fetch(url, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  // GET 요청
  async get(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  // DELETE 요청
  async delete(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }

  // ✅ 수정된 FormData 전용 편의 메서드들 - Response 객체를 직접 반환
  async postFormData(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<Response> {
    console.log('postFormData called with:', { url, formData, options });
    return this.post(url, formData, options);
  }

  async putFormData(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<Response> {
    return this.put(url, formData, options);
  }

  async patchFormData(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<Response> {
    return this.patch(url, formData, options);
  }

  // JSON 응답을 자동으로 파싱하는 편의 메서드들
  async getJson<T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.get(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async postJson<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.post(url, data, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async putJson<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.put(url, data, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async patchJson<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.patch(url, data, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteJson<T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const response = await this.delete(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ✅ 추가: FormData 전용 JSON 파싱 메서드들 (에러 처리 포함)
  async postFormDataJson<T = any>(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.postFormData(url, formData, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async putFormDataJson<T = any>(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.putFormData(url, formData, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async patchFormDataJson<T = any>(url: string, formData: FormData, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    const response = await this.patchFormData(url, formData, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
}