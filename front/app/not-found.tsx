'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
      
      <div className="relative z-10 text-center px-4">
        <div className="mb-4">
          <span className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-purple-600">
            404
          </span>
        </div>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
          Page not found
        </p>
        <Link href="/">
          <Button>
            Back to home
          </Button>
        </Link>
      </div>
    </section>
  );
} 