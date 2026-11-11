import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowLeft, Clock, Calendar, ShieldCheck, Share2,
  BookOpen, ChevronRight, TrendingUp, BarChart3, Target,
  Sparkles, CheckCircle2, Award, ExternalLink
} from "lucide-react";
import { EditorialArticle } from "@/data/editorial-magazine-data";

interface EditorialArticleReaderProps {
  article: EditorialArticle | null;
  onClose: () => void;
  onSelectArticle: (slug: string) => void;
  allArticles: EditorialArticle[];
}

export function EditorialArticleReader({
  article,
  onClose,
  onSelectArticle,
  allArticles,
}: EditorialArticleReaderProps) {
  if (!article) return null;

  const relatedArticles = allArticles.filter(
    (a) => article.relatedSlugs?.includes(a.slug) || (a.category === article.category && a.id !== article.id)
  ).slice(0, 3);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Article link copied to clipboard!");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/85 backdrop-blur-2xl">
        {/* Modal Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 pointer-events-auto"
        />

        {/* Modal Window: High-End Magazine Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#090E17] border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.15)] text-slate-100 flex flex-col"
        >
          {/* Top Sticky Command Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#090E17]/95 border-b border-white/10 backdrop-blur-xl">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Editorial Hub</span>
            </button>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Research Laboratory
              </span>
              <button
                onClick={handleCopyLink}
                title="Share Article"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Article Editorial Canvas */}
          <article className="p-6 sm:p-10 space-y-8">
            {/* Header Eyebrow & Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${article.categoryColor}`}>
                {article.category}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {article.publishedDate}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime}
              </span>
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
                {article.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl font-light">
                {article.subtitle}
              </p>
            </div>

            {/* Author Byline */}
            <div className="flex items-center justify-between py-4 border-y border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold font-mono text-xs text-white shadow-md">
                  {article.author.avatarText}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{article.author.name}</div>
                  <div className="text-xs font-mono text-slate-400">{article.author.role}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                  CRICFIELD LAB REPORT
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {article.evidenceSources.length} Data Sources Verified
                </div>
              </div>
            </div>

            {/* Hero Key Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 backdrop-blur-md">
              {article.keyStats.map((st, i) => (
                <div key={i} className="text-center p-2 rounded-xl bg-white/[0.01]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {st.label}
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-0.5">
                    {st.value}
                  </div>
                  {st.sub && (
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {st.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Key Findings Box */}
            <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Executive Summary & Key Analytical Findings</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {article.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Editorial Content Sections */}
            <div className="space-y-8 pt-4">
              {article.contentSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-4">
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-cyan-400" />
                    {sec.heading}
                  </h2>

                  <div className="space-y-3.5 text-slate-300 leading-relaxed text-sm sm:text-base font-normal">
                    {sec.body.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {/* Interactive Table if present */}
                  {sec.table && (
                    <div className="my-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-white/5 border-b border-white/10 text-cyan-300 uppercase tracking-wider">
                          <tr>
                            {sec.table.headers.map((h, i) => (
                              <th key={i} className="py-3 px-4 font-bold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {sec.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className={`py-3 px-4 ${cIdx === 0 ? "font-bold text-white" : "text-slate-300"}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pull Quote if present */}
                  {sec.quote && (
                    <div className="p-5 rounded-2xl border-l-4 border-cyan-400 bg-white/[0.02] italic text-slate-200 text-sm sm:text-base my-4">
                      "{sec.quote}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Methodology & Verification Footer */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.01] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Statistical Rigor & Methodology Notes</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                {article.methodologyNote}
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Verified Sources:</span>
                {article.evidenceSources.map((src, i) => (
                  <span key={i} className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    {src}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Stories Strip */}
            {relatedArticles.length > 0 && (
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Related Intelligence & Analysis
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {relatedArticles.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => onSelectArticle(rel.slug)}
                      className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <div className="text-[9px] font-mono uppercase text-cyan-400 mb-1">
                        {rel.category}
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {rel.title}
                      </h4>
                      <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>{rel.readTime}</span>
                        <ChevronRight className="w-3 h-3 text-cyan-400 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
