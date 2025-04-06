"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  externalValue,
  onFocus,
  disabled,
}: {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  externalValue?: string;
  onFocus?: () => void;
  disabled?: boolean;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startAnimation = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  }, [placeholders.length]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current); // Clear the interval when the tab is not visible
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation(); // Restart the interval when the tab becomes visible
    }
  }, [startAnimation]);

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders, handleVisibilityChange, startAnimation]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState("");
  
  // Mettre à jour la valeur interne lorsque la valeur externe change
  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);
  
  // Utiliser la valeur combinée pour le rendu
  const value = externalValue !== undefined ? externalValue : internalValue;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault(); // Empêcher le saut de ligne par défaut
        vanishAndSubmit();
      }
    }
  };

  const vanishAndSubmit = () => {
    // Appeler directement la méthode de soumission sans animation
    if (onSubmit) {
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>;
      onSubmit(formEvent);
    }
    
    // Reset après soumission
    setInternalValue("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Ne plus appeler vanishAndSubmit ici pour éviter la double soumission
    if (onSubmit) onSubmit(e);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    if (onChange) onChange(e as any);
  };
  
  const handleFocus = () => {
    if (onFocus) onFocus();
  };
  
  return (
    <form
      className={cn(
        "w-full relative max-w-xl mx-auto bg-[#151d2e] min-h-12 rounded-lg overflow-hidden shadow-md transition duration-200 border border-[#273549] hover:border-blue-600/30",
        value && "bg-[#1c2539]"
      )}
      onSubmit={handleSubmit}
    >
      <textarea
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        ref={inputRef}
        value={value}
        rows={1}
        disabled={disabled}
        className={cn(
          "w-full relative text-sm sm:text-base z-50 border-none text-white bg-transparent min-h-12 resize-none rounded-lg focus:outline-none focus:ring-0 py-3 pl-5 sm:pl-6 pr-20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />

      <button
        disabled={!value || disabled}
        type="submit"
        className="absolute right-3 top-1/2 z-50 -translate-y-1/2 h-8 w-8 rounded-md disabled:bg-[#1b2638] bg-blue-600 transition duration-200 flex items-center justify-center"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white h-4 w-4"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <motion.path
            d="M5 12l14 0"
            initial={{
              strokeDasharray: "50%",
              strokeDashoffset: "50%",
            }}
            animate={{
              strokeDashoffset: value ? 0 : "50%",
            }}
            transition={{
              duration: 0.3,
              ease: "linear",
            }}
          />
          <path d="M13 18l6 -6" />
          <path d="M13 6l6 6" />
        </motion.svg>
      </button>

      <div className="absolute inset-0 flex items-center rounded-lg pointer-events-none">
        <AnimatePresence mode="wait">
          {!value && (
            <motion.p
              initial={{
                y: 5,
                opacity: 0,
              }}
              key={`current-placeholder-${currentPlaceholder}`}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: -15,
                opacity: 0,
              }}
              transition={{
                duration: 0.3,
                ease: "linear",
              }}
              className="text-gray-400 text-sm sm:text-base font-normal pl-5 sm:pl-6 text-left w-[calc(100%-2rem)] truncate"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
