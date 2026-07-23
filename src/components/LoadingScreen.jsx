import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
];

export default function LoadingScreen({ onComplete, duration = 4500 }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setIndex((prev) => (prev + 1) % QUOTES.length);
    }, 2200);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(quoteTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  const quote = QUOTES[index];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6">
      {/* Animated logo + spinner */}
      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <GraduationCap className="w-10 h-10" />
        </motion.div>
        <div className="absolute -inset-2 rounded-3xl border-4 border-primary/15 border-t-primary animate-spin" style={{ animationDuration: "0.9s" }} />
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-1">
        Remind<span className="text-primary">Set</span>
      </h2>
      <p className="text-sm text-muted-foreground mb-10">Preparing your dashboard…</p>

      {/* Rotating quote */}
      <div className="max-w-md text-center min-h-[100px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <p className="text-base font-medium leading-relaxed text-foreground/90">“{quote.text}”</p>
            <p className="text-sm text-primary font-semibold">— {quote.author}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-8">
        {QUOTES.slice(0, 5).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index % 5 ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}