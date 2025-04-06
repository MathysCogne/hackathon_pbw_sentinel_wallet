'use client';

import { useState, useEffect } from 'react';
import { getSession } from '@/app/actions';

interface User {
  id: string;
  walletAddress: string;
  userToken?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Utiliser la fonction getSession pour récupérer les infos de l'utilisateur
        const { user: sessionUser } = await getSession();
        
        if (isMounted) {
          if (sessionUser) {
            console.log('User session found:', sessionUser);
            setUser({
              id: sessionUser.id,
              walletAddress: sessionUser.walletAddress,
              userToken: sessionUser.userToken || undefined,
            });
          } else {
            console.log('No user session found');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return { user, loading };
} 