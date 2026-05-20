import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaText, onCtaClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-12 border border-white/5 bg-white/[0.01] relative overflow-hidden text-center min-h-[350px] group"
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00f2ff]/50 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      <div className="p-5 border border-[#00f2ff]/15 bg-[#00f2ff]/5 mb-8 group-hover:scale-110 group-hover:bg-[#00f2ff]/10 transition-all duration-500">
        <Icon className="text-[#00f2ff]" size={32} />
      </div>
      <h3 className="text-lg font-black italic uppercase tracking-wider text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-500 font-mono text-[11px] max-w-md leading-relaxed mb-8 uppercase tracking-wide">
        {description}
      </p>
      {ctaText && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="bg-[#00f2ff] text-black px-10 py-4 font-black text-[10px] uppercase tracking-[0.3em] hover:shadow-[0_0_25px_rgba(0,242,255,0.5)] active:scale-95 transition-all duration-300 flex items-center gap-3 border-none outline-none cursor-pointer"
        >
          <Plus size={14} />
          {ctaText}
        </button>
      )}
    </motion.div>
  );
}
