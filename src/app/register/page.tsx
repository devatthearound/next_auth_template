'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'CUSTOMER',
    // 고객 정보
    address: '',
    // 사장님 정보
    businessName: '',
    businessAddress: '',
  });
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 기본 유효성 검사
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    // 사장님인 경우 필수 필드 확인
    if (formData.userType === 'OWNER' && !formData.businessName) {
      setError('Business name is required for owners');
      return;
    }
    
    // 데이터 준비
    const userData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      userType: formData.userType,
    };
    
    // 사용자 유형에 따른 추가 데이터
    if (formData.userType === 'CUSTOMER') {
      Object.assign(userData, {
        customer: {
          address: formData.address,
        },
      });
    } else {
      Object.assign(userData, {
        owner: {
          businessName: formData.businessName,
          businessAddress: formData.businessAddress,
        },
      });
    }
    
    const success = await register(userData);
    if (success) {
      router.push('/login?registered=true');
    } else {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter your email"
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 mb-2">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter your password (min 8 characters)"
            disabled={isLoading}
            required
            minLength={8}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 mb-2">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter your name"
            disabled={isLoading}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="userType" className="block text-gray-700 mb-2">User Type</label>
          <select
            id="userType"
            name="userType"
            value={formData.userType}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isLoading}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="OWNER">Business Owner</option>
          </select>
        </div>
        
        {formData.userType === 'CUSTOMER' && (
          <div className="mb-4">
            <label htmlFor="address" className="block text-gray-700 mb-2">Address (Optional)</label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Enter your address"
              disabled={isLoading}
            />
          </div>
        )}
        
        {formData.userType === 'OWNER' && (
          <>
            <div className="mb-4">
              <label htmlFor="businessName" className="block text-gray-700 mb-2">Business Name</label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter your business name"
                disabled={isLoading}
                required={formData.userType === 'OWNER'}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="businessAddress" className="block text-gray-700 mb-2">Business Address</label>
              <input
                id="businessAddress"
                name="businessAddress"
                type="text"
                value={formData.businessAddress}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter your business address"
                disabled={isLoading}
              />
            </div>
          </>
        )}
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p>
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:text-blue-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}