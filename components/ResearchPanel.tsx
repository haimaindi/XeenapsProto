
import React, { useState } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { performResearch } from '../services/geminiService';
import { COLORS } from '../constants';

const ResearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, sources: any[] } | null>(null);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const data = await performResearch(query);
      setResult(data);
    } catch (err) {
      alert("Research failed. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#0088A311]">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-2 md:p-3 bg-[#E8FBFF] rounded-2xl text-[#0088A3]">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#003B47]">Smart Research</h2>
            <p className="text-xs md:text-sm text-gray-500">Ask deep scholarly questions powered by Gemini AI</p>
          </div>
        </div>

        <form onSubmit={handleResearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Explain the impact of quantum computing..."
            className="w-full p-4 pl-6 pr-4 md:pr-28 bg-[#E8FBFF] border-none rounded-2xl focus:ring-2 focus:ring-[#0088A3] transition-all text-[#003B47] placeholder-gray-400 shadow-inner text-sm md:text-base mb-3 md:mb-0"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto md:absolute md:right-2 md:top-2 md:bottom-2 px-6 py-3 md:py-0 bg-[#0088A3] text-white rounded-xl hover:bg-[#003B47] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-sm"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            <span>{isLoading ? 'Searching...' : 'Search'}</span>
          </button>
        </form>
      </div>

      {result && (
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#0088A311]">
            <h3 className="text-base md:text-lg font-bold text-[#003B47] mb-4 flex items-center gap-2">
              <BookOpen className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#0088A3]" />
              Research Summary
            </h3>
            <div className="prose prose-teal max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {result.text}
            </div>
          </div>

          {result.sources.length > 0 && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#0088A311]">
              <h3 className="text-base md:text-lg font-bold text-[#003B47] mb-4">Referenced Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 md:p-4 bg-[#E8FBFF] rounded-xl group hover:bg-[#0088A3] hover:text-white transition-all text-xs md:text-sm"
                  >
                    <span className="font-medium truncate pr-4">{source.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 opacity-50 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {['Deep Analysis', 'Real-time Grounding', 'Scholarly Insights'].map((feature) => (
            <div key={feature} className="p-4 md:p-6 bg-white/50 border border-dashed border-[#0088A333] rounded-3xl text-center">
              <p className="text-[#0088A3] font-semibold text-xs md:text-sm">{feature}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchPanel;
