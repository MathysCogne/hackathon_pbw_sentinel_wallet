'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TEXT } from '@/constants/text';

export const XummConnect = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle login with Xumm
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Initiating Xumm login...');
      
      // Create a signature payload
      const response = await fetch('/api/auth/xumm/create-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create authentication request:', errorData);
        throw new Error(errorData.error || 'Failed to create authentication request');
      }
      
      const payload = await response.json();
      console.log('Received Xumm payload:', payload);
      
      if (!payload || !payload.next || !payload.next.always) {
        throw new Error('Invalid payload received from server');
      }
      
      // Stocker l'UUID du payload en localStorage pour le récupérer au retour
      if (payload.uuid) {
        localStorage.setItem('xumm_payload_id', payload.uuid);
      }
      
      // Obtenir l'URL de redirection
      const redirectUrl = payload.next.always;
      console.log('Redirecting to:', redirectUrl);
      
      // Open Xumm signature page
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogin}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {TEXT.actions.loading}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9L15 15M15 9L9 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {TEXT.xumm.connect}
          </>
        )}
      </motion.button>
    </>
  );
}; 