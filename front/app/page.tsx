'use client';

import { Hero } from "@/components/section/Hero";
import { useEffect } from "react";

export default function Home() {
  // Utiliser useEffect pour s'assurer que ce code s'exécute uniquement côté client
  useEffect(() => {
    // Vérifier si sessionStorage est disponible (côté client)
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('auth_form_submitted')) {
        localStorage.removeItem('xumm_payload_id');
        sessionStorage.removeItem('auth_form_submitted');
      }
    }
  }, []);

  return (
    <main className="h-screen w-full overflow-hidden">
      <Hero />
    </main>
  );
}
