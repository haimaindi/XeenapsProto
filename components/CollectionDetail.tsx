
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ExternalLink, Calendar, Users, Tag, BookOpen, Globe, Bookmark, Heart, Trash2, Hash, Building2, Share2, Quote, Lightbulb, CheckCircle, XCircle, Search, List, Edit2, Check, X, Save, Sparkles, Loader2, Copy, RefreshCw, Clock } from 'lucide-react';
import { CollectionEntry, CitationSet, Terminology, SupportingRef } from '../types';
import { SmartSearchableDropdown, MultiSelectSmartDropdown, useMemoryList, INITIAL_CATEGORIES } from './AddCollectionForm';
import { analyzeCollectionSource } from '../services/geminiService';
import { fetchFileData } from '../services/spreadsheetService';
import Swal from 'sweetalert2';

interface CollectionDetailProps {
  entry: CollectionEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CollectionEntry>) => void;
}

const TYPES = ["Literature", "Task", "Personal", "Other"];

const EditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  field: keyof CollectionEntry;
  currentValue: any;
  onSave: (val: any) => void;
}> = ({ isOpen, onClose, title, field, currentValue, onSave }) => {
  const [val, setVal] = useState(currentValue);

  const categoryMem = useMemoryList('categories', INITIAL_CATEGORIES);
  const topicMem = useMemoryList('topics');
  const subTopicMem = useMemoryList('subtopics');
  const publisherMem = useMemoryList('publishers');
  const authorMem = useMemoryList('authors');
  const keywordMem = useMemoryList('keywords');
  const tagMem = useMemoryList('tags');

  useEffect(() => {
    setVal(currentValue);
  }, [currentValue, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (field === 'category') categoryMem.addValue(val);
    if (field === 'topic') topicMem.addValue(val);
    if (field === 'subTopic') subTopicMem.addValue(val);
    if (field === 'publisher') publisherMem.addValue(val);
    if (field === 'authorName' && Array.isArray(val)) authorMem.addValues(val);
    if (field === 'keyword' && Array.isArray(val)) keywordMem.addValues(val);
    if (field === 'tagLabel' && Array.isArray(val)) tagMem.addValues(val);

    let finalVal = val;
    if (field === 'authorName' && Array.isArray(val)) finalVal = val.join(', ');
    if (field === 'keyword' && Array.isArray(val)) finalVal = val.join(', ');
    if (field === 'tagLabel' && Array.isArray(val)) finalVal = val.join(', ');

    onSave(finalVal);
    onClose();
  };

  const renderInput = () => {
    if (field === 'type') {
      return <SmartSearchableDropdown label="Type" value={val} options={TYPES} placeholder="Select Type" onSelect={setVal} />;
    }
    if (field === 'category') {
      return <SmartSearchableDropdown label="Category" value={val} options={categoryMem.list} placeholder="Select Category" onSelect={setVal} />;
    }
    if (field === 'topic') {
      return <SmartSearchableDropdown label="Topic" value={val} options={topicMem.list} placeholder="Select Topic" onSelect={setVal} />;
    }
    if (field === 'subTopic') {
      return <SmartSearchableDropdown label="Sub Topic" value={val} options={subTopicMem.list} placeholder="Select Sub Topic" onSelect={setVal} />;
    }
    if (field === 'publisher') {
      return <SmartSearchableDropdown label="Publisher" value={val} options={publisherMem.list} placeholder="Select Publisher" onSelect={setVal} />;
    }

    if (field === 'authorName') {
      const currentArr = typeof val === 'string' ? val.split(', ').filter(Boolean) : (Array.isArray(val) ? val : []);
      return <MultiSelectSmartDropdown label="Authors" values={currentArr} options={authorMem.list} placeholder="Select Authors" onValuesChange={setVal} />;
    }
    if (field === 'keyword') {
      const currentArr = typeof val === 'string' ? val.split(', ').filter(Boolean) : (Array.isArray(val) ? val : []);
      return <MultiSelectSmartDropdown label="Keywords" values={currentArr} options={keywordMem.list} placeholder="Select Keywords" onValuesChange={setVal} />;
    }
    if (field === 'tagLabel') {
      const currentArr = typeof val === 'string' ? val.split(', ').filter(Boolean) : (Array.isArray(val) ? val : []);
      return <MultiSelectSmartDropdown label="Tags" values={currentArr} options={tagMem.list} placeholder="Select Tags" onValuesChange={setVal} />;
    }

    if (['abstract', 'summary', 'strength', 'weakness', 'unfamiliarTerminology', 'inReferenceCitation', 'researchMethodology', 'supportingReferences'].includes(field)) {
      const textVal = Array.isArray(val) ? val.join('\n') : (typeof val === 'object' ? JSON.stringify(val, null, 2) : val);
      return (
        <div className="space-y-3 h-full flex flex-col">
            <label className="text-xs md:text-sm font-black text-[#003B47] uppercase tracking-wide block">Content</label>
            <textarea
                value={textVal}
                onChange={(e) => setVal(e.target.value)}
                className="w-full p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#0088A344] bg-[#F5F9FA] focus:bg-white focus:border-[#0088A3] outline-none text-[#002A32] text-sm md:text-lg leading-relaxed font-medium resize-none shadow-inner flex-1"
                placeholder="Type comprehensive details here..."
            />
        </div>
      );
    }

    return (
        <div className="space-y-3">
             <label className="text-xs md:text-sm font-black text-[#003B47] uppercase tracking-wide block">Value</label>
             <input 
                type="text" 
                value={val} 
                onChange={(e) => setVal(e.target.value)} 
                className="w-full p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#0088A344] bg-[#F5F9FA] focus:bg-white focus:border-[#0088A3] outline-none text-[#002A32] text-base md:text-xl font-bold shadow-sm placeholder-gray-400 transition-all"
                placeholder="Enter value..."
             />
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#003B47]/70 backdrop-blur-lg flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border-0 md:border border-white/20 w-full h-full md:rounded-[2rem] md:w-[95vw] md:h-[95vh] md:max-w-[95vw] md:max-h-[95vh]">
        <div className="p-4 md:p-8 border-b border-gray-100 flex items-center justify-between bg-white md:rounded-t-[2rem] z-10 shrink-0">
          <div>
            <p className="text-[#0088A3] text-[10px] md:text-sm font-black uppercase tracking-widest mb-1">Edit Mode</p>
            <h3 className="text-xl md:text-3xl font-black text-[#003B47] line-clamp-1">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-gray-100 rounded-xl md:rounded-2xl transition-all text-gray-400 hover:text-red-500 border border-transparent hover:border-gray-200 group">
            <X className="w-6 h-6 md:w-7 md:h-7 group-hover:rotate-90 transition-transform" strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="h-full flex flex-col">
            {renderInput()}
          </div>
        </div>
        <div className="p-4 md:p-8 border-t border-gray-100 bg-gray-50 md:rounded-b-[2rem] flex justify-end gap-3 md:gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-3 md:px-10 md:py-4 rounded-xl font-bold text-gray-500 hover:bg-white hover:text-[#003B47] hover:shadow-md transition-all border border-transparent hover:border-gray-200 text-sm md:text-lg">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-3 md:px-12 md:py-4 bg-[#0088A3] text-white rounded-xl font-black hover:bg-[#003B47] transition-all shadow-xl shadow-[#0088A333] flex items-center gap-2 md:gap-3 active:scale-95 text-sm md:text-lg">
            <Save className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" strokeWidth={2.5} />
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
};

const CitationDisplay = ({ label, citations, icon: Icon }: { label: string, citations: string | undefined, icon: any }) => {
  const [activeStyle, setActiveStyle] = useState<'apa' | 'harvard'>('apa');
  
  let citationObj: Partial<CitationSet> | null = null;
  try {
    citationObj = citations ? JSON.parse(citations) : null;
  } catch (e) {
    citationObj = citations ? { apa: citations, harvard: '-' } : null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      icon: 'success',
      title: 'Copied to clipboard!',
      background: '#E8FBFF',
      color: '#003B47',
    });
  };

  const getStyleText = () => {
    if (!citationObj) return '-';
    return citationObj[activeStyle] || '-';
  };

  return (
    <div className="p-4 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-200 group relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400"/>
          <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
        </div>
        <div className="flex items-center bg-white rounded-lg border border-gray-100 p-0.5 shadow-sm">
          {(['apa', 'harvard'] as const).map(style => (
            <button
              key={style}
              onClick={() => setActiveStyle(style)}
              className={`px-2 py-1 text-[8px] md:text-[9px] font-black uppercase rounded-md transition-all ${activeStyle === style ? 'bg-[#0088A3] text-white' : 'text-gray-400 hover:text-[#0088A3]'}`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex-1 font-mono text-[10px] md:text-xs text-[#003B47] break-words bg-white/50 p-3 rounded-lg border border-dashed border-gray-200 min-h-[3rem]">
          {getStyleText()}
        </div>
        {citationObj && citationObj[activeStyle] && (
          <button 
            onClick={() => copyToClipboard(citationObj![activeStyle]!)}
            className="p-2 bg-white rounded-lg border border-gray-200 text-[#0088A3] hover:bg-[#0088A3] hover:text-white transition-all shadow-sm shrink-0"
            title="Copy Citation"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const CollectionDetail: React.FC<CollectionDetailProps> = ({ entry, onBack, onDelete, onUpdate }) => {
  const [editingField, setEditingField] = useState<{key: keyof CollectionEntry, title: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewLang, setViewLang] = useState<'en' | 'id'>('en');

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Literature': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Task': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'Personal': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const safeJsonParse = (str: string | undefined, fallback: any = {}) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const safeJsonParseArray = (str: string | undefined) => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleAIAnalyze = async () => {
    const result = await Swal.fire({
      title: 'Select Analysis Language',
      text: 'AI will perform deep analysis in your chosen language.',
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '🇺🇸 English',
      denyButtonText: '🇮🇩 Indonesia',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0088A3',
      denyButtonColor: '#be2690',
      cancelButtonColor: '#9CA3AF',
      reverseButtons: true,
      backdrop: `rgba(0, 59, 71, 0.4) backdrop-blur-sm`,
      customClass: {
        popup: 'rounded-[2.5rem] p-8',
        title: 'text-[#003B47] font-black text-2xl',
        htmlContainer: 'text-gray-500 font-medium',
        confirmButton: 'rounded-xl font-bold px-6 py-3 shadow-lg',
        denyButton: 'rounded-xl font-bold px-6 py-3 shadow-lg',
        cancelButton: 'rounded-xl font-bold px-4 py-3 bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none',
        actions: 'gap-3 w-full justify-center'
      }
    });

    if (!result.isConfirmed && !result.isDenied) return;

    const targetLang = result.isConfirmed ? 'EN' : 'ID';
    const langKey = targetLang === 'EN' ? 'en' : 'id';
    
    // Update view language preference immediately to show the results in the requested language
    setViewLang(langKey);

    setIsAnalyzing(true);
    
    try {
      let fileDataToUse = entry.fileData;

      if (entry.sourceMethod === 'upload' && !fileDataToUse) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Retrieving file from cloud...',
          showConfirmButton: false,
          timer: 3000
        });
        
        // Fix: fetchFileData returns a DriveFileData object, extract the .data property (base64 string)
        const driveResult = await fetchFileData(entry.sourceValue);
        fileDataToUse = driveResult?.data || undefined;
        
        if (!fileDataToUse) {
          throw new Error("Could not retrieve file content from Drive.");
        }
      }

      // Pass extractedText as the 5th argument
      const result = await analyzeCollectionSource(
        entry.sourceValue, 
        entry.sourceMethod, 
        targetLang, 
        fileDataToUse,
        entry.extractedText
      );
      
      const mergeDualLangField = (currentJsonStr: string | undefined, newText: string) => {
        const currentObj = safeJsonParse(currentJsonStr, { en: "", id: "" });
        return JSON.stringify({ ...currentObj, [langKey]: newText });
      };

      const mapTerminology = (terms: any[]) => {
         if (!Array.isArray(terms)) return "[]";
         return JSON.stringify(terms.map((t: any) => ({
           term: t.term,
           explanation: {
             [langKey]: t.explanation,
             [langKey === 'en' ? 'id' : 'en']: "" 
           }
         })));
      };

      const mapReferences = (refs: any[]) => {
        if (!Array.isArray(refs)) return "[]";
        return JSON.stringify(refs.map((r: any) => ({
          citation: r.citation,
          link: r.link,
          relevance: {
            [langKey]: r.relevance,
            [langKey === 'en' ? 'id' : 'en']: ""
          }
        })));
      };

      const updates: Partial<CollectionEntry> = {
        title: result.title || entry.title,
        authorName: result.authorName || entry.authorName,
        year: result.year || entry.year,
        publisher: result.publisher || entry.publisher,
        keyword: result.keyword || entry.keyword,
        tagLabel: result.tagLabel || entry.tagLabel,
        inTextCitation: JSON.stringify(result.inTextCitation),
        inReferenceCitation: JSON.stringify(result.inReferenceCitation),
        
        researchMethodology: mergeDualLangField(entry.researchMethodology, result.researchMethodology),
        abstract: mergeDualLangField(entry.abstract, result.abstract),
        summary: mergeDualLangField(entry.summary, result.summary),
        strength: mergeDualLangField(entry.strength, result.strength),
        weakness: mergeDualLangField(entry.weakness, result.weakness),
        tipsForYou: mergeDualLangField(entry.tipsForYou, result.tipsForYou),
        
        unfamiliarTerminology: mapTerminology(result.unfamiliarTerminology || []),
        supportingReferences: mapReferences(result.supportingReferences || []),

        updatedDateTime: new Date().toISOString()
      };

      onUpdate(entry.id, updates);

      Swal.fire({
        title: 'Analysis Complete!',
        text: `Document successfully analyzed in ${targetLang === 'EN' ? 'English' : 'Indonesian'}.`,
        icon: 'success',
        confirmButtonColor: '#0088A3',
        customClass: {
          popup: 'rounded-[2rem]',
          confirmButton: 'rounded-xl font-bold px-8 py-3'
        }
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
         title: 'Analysis Failed', 
         text: err instanceof Error ? err.message : 'Could not analyze the document.', 
         icon: 'error',
         confirmButtonColor: '#0088A3'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const EditTrigger = ({ field, title, className = "" }: { field: keyof CollectionEntry, title: string, className?: string }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); setEditingField({ key: field, title }); }}
      className={`p-1.5 rounded-lg text-[#0088A3] hover:bg-[#0088A311] opacity-0 group-hover:opacity-100 transition-all ml-2 ${className}`}
      title={`Edit ${title}`}
    >
      <Edit2 size={14} />
    </button>
  );

  const SafeHtmlRenderer = ({ text }: { text: string | undefined }) => {
    if (!text) return <span className="text-gray-300 italic">No content available.</span>;
    
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');

    return (
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <div 
            key={i} 
            className="text-justify leading-relaxed text-[#002A32] [&>b]:font-black [&>b]:text-[#003B47] [&>i]:text-[#0088A3] [&>i]:font-medium [&>i]:italic [&>span]:font-bold [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:marker:text-[#0088A3] [&>li]:marker:font-bold"
            dangerouslySetInnerHTML={{ __html: para }}
          />
        ))}
      </div>
    );
  };

  // Updated to support View Language Preference
  const getAutoDetectedContent = (raw: string | undefined) => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
         // Check strictly for preferred language first
         if (parsed[viewLang] && parsed[viewLang].trim().length > 0) return parsed[viewLang];
         // Fallback to whatever exists
         return parsed.en || parsed.id;
      }
      return raw;
    } catch (e) {
      return raw;
    }
  };

  const AnalysisSection = ({ 
    title, value, field, icon: Icon, className = "", highlightColor = "#0088A308", readOnly = false
  }: { 
    title: string, value: string | undefined, field: keyof CollectionEntry, icon: any, className?: string, highlightColor?: string, readOnly?: boolean
  }) => {
    const displayValue = getAutoDetectedContent(value);
    
    return (
      <div className={`bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm space-y-3 md:space-y-4 group relative ${className}`} style={{ backgroundColor: highlightColor }}>
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100/50">
          <Icon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#0088A3]" />
          <h3 className="text-xs md:text-sm font-black text-[#003B47] uppercase tracking-wider">{title}</h3>
          {!readOnly && <EditTrigger field={field} title={title} className="opacity-0 group-hover:opacity-100 absolute right-4 top-4" />}
        </div>
        <div className="text-gray-600 text-sm md:text-base min-h-[2rem]">
           <SafeHtmlRenderer text={displayValue} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto custom-scrollbar relative flex flex-col">
      
      {isAnalyzing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 cursor-wait">
          <div className="relative group">
            <img 
              src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
              className="w-24 h-24 object-contain animate-spin" 
              style={{ animationDuration: '3s' }}
              alt="Smart Scholar Icon"
            />
            <div className="absolute inset-0 bg-[#0088A3] opacity-20 blur-3xl rounded-full animate-pulse" />
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
             <h3 className="text-2xl font-black text-[#003B47]">Analyzing Document...</h3>
             <p className="text-[#0088A3] font-bold text-xs uppercase tracking-widest flex items-center gap-2 animate-pulse">
               <Sparkles className="w-4 h-4" />
               AI Research Assistant Working
             </p>
          </div>
        </div>
      )}

      {editingField && (
        <EditModal 
            isOpen={!!editingField} onClose={() => setEditingField(null)}
            title={editingField.title} field={editingField.key}
            currentValue={entry[editingField.key]}
            onSave={(val) => onUpdate(entry.id, { [editingField.key]: val })}
        />
      )}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="p-2 hover:bg-[#E8FBFF] rounded-xl text-[#0088A3] transition-all border border-transparent hover:border-[#0088A333] group">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={handleAIAnalyze} disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
              isAnalyzing ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-[#0088A3] to-[#003B47] text-white hover:shadow-lg'
            }`}
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300" />}
            <span>{isAnalyzing ? 'ANALYZING...' : 'AI ANALYZE'}</span>
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
           <a href={entry.sourceValue} target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#0088A3] text-white rounded-xl text-xs font-black transition-all hover:bg-[#003B47]">
              {entry.sourceMethod === 'upload' ? <FileText size={16} /> : <ExternalLink size={16} />}
              OPEN DOCUMENT
            </a>
            <a href={entry.sourceValue} target="_blank" rel="noopener noreferrer" className="md:hidden flex p-2.5 rounded-xl bg-[#0088A3] text-white hover:bg-[#003B47] transition-all">
              {entry.sourceMethod === 'upload' ? <FileText size={18} /> : <ExternalLink size={18} />}
            </a>
          <div className="w-px h-6 md:h-8 bg-gray-200 mx-1 md:mx-2 hidden md:block"></div>
          <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-[#be2690] hover:bg-[#be269011] transition-all" title="Favourite">
            <Heart className={`w-[18px] h-[18px] md:w-5 md:h-5 ${entry.isFavourite ? "text-[#be2690]" : ""}`} fill={entry.isFavourite ? "currentColor" : "none"} />
          </button>
          <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-[#0088A3] hover:bg-[#0088A311] transition-all" title="Bookmark">
            <Bookmark className={`w-[18px] h-[18px] md:w-5 md:h-5 ${entry.isBookmarked ? "text-[#0088A3]" : ""}`} fill={entry.isBookmarked ? "currentColor" : "none"} />
          </button>
          <button onClick={() => onDelete(entry.id)} className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
            <Trash2 className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 pt-4 md:pt-6 pb-4 md:pb-6 space-y-3 md:space-y-4 w-full border-b border-gray-50/50 group">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 group/row">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${getTypeStyles(entry.type)}`}>
            {entry.type}
            <button onClick={(e) => { e.stopPropagation(); setEditingField({ key: 'type', title: 'Classification Type' }); }} className="p-0.5 rounded-full hover:bg-black/10 transition-colors"><Edit2 size={10} /></button>
          </span>
          <span className="text-gray-300">|</span>
          <div className="text-[10px] md:text-xs font-bold text-[#003B47] uppercase tracking-widest flex items-center gap-2">{entry.category}<EditTrigger field="category" title="Category" /></div>
        </div>
        <div className="relative group/title">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[#003B47] leading-tight break-words max-w-5xl pr-8 md:pr-10 italic">{entry.title}</h1>
          <div className="absolute top-1 md:top-2 right-0 md:left-[100%]"><EditTrigger field="title" title="Title" className="opacity-100 md:opacity-0 group-hover/title:opacity-100" /></div>
        </div>
        <div className="flex items-center gap-2 md:gap-2.5 text-[#003B47] group/author">
          <div className="p-1 md:p-1.5 bg-[#0088A311] rounded-full"><Users className="w-4 h-4 md:w-[18px] md:h-[18px] text-[#0088A3]" /></div>
          <div className="font-bold text-sm md:text-lg flex-1 flex items-center gap-2">{entry.authorName || "Unknown Author"}<EditTrigger field="authorName" title="Author Name" className="group-hover/author:opacity-100" /></div>
        </div>
        
        {/* Restored Metadata Layout */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-50/50">
             <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-gray-600 font-medium">
                <div className="flex items-center gap-2 group/year">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0088A3]" />
                    <span className="font-bold text-[#003B47]">{entry.year || "Year"}</span>
                    <EditTrigger field="year" title="Year" className="group-hover/year:opacity-100" />
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-2 group/pub">
                    <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0088A3]" />
                    <span className="font-bold text-[#003B47]">{entry.publisher || "Publisher"}</span>
                    <EditTrigger field="publisher" title="Publisher" className="group-hover/pub:opacity-100" />
                </div>
            </div>
             <div className="flex flex-wrap items-center gap-4 text-[10px] md:text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                    <span>Created: <span className="text-[#003B47] font-bold">{formatDateTime(entry.createdDateTime)}</span></span>
                </div>
                {entry.updatedDateTime && (
                     <>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2">
                            <span>Updated: <span className="text-[#003B47] font-bold">{formatDateTime(entry.updatedDateTime)}</span></span>
                        </div>
                     </>
                )}
            </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-32 w-full">
          {/* Restored 3-Card Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            {/* Card 1: Topic & SubTopic */}
            <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#E8FBFF] to-white border border-[#0088A322] flex flex-col justify-center shadow-sm relative group h-full">
               <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1">
                 <EditTrigger field="topic" title="Topic" className="opacity-0 group-hover:opacity-100" />
                 <EditTrigger field="subTopic" title="Sub Topic" className="opacity-0 group-hover:opacity-100" />
               </div>
               <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Topic</p>
               <p className="text-base md:text-xl font-black text-[#003B47] mb-2 leading-tight">{entry.topic}</p>
               
               <div className="w-8 h-0.5 bg-[#0088A3] opacity-20 mb-2"></div>

               <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sub Topic</p>
               <p className="text-sm md:text-base font-bold text-[#003B47]/80">{entry.subTopic || "-"}</p>
            </div>

            {/* Card 2: Keywords */}
            <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 flex flex-col justify-center shadow-sm relative group h-full">
               <div className="absolute top-3 right-3 md:top-4 md:right-4"><EditTrigger field="keyword" title="Keywords" className="opacity-0 group-hover:opacity-100" /></div>
               <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Keywords</p>
               <div className="flex flex-wrap gap-2">
                 {entry.keyword?.split(', ').map((k, i) => (
                   <span key={i} className="px-2.5 py-1.5 bg-white rounded-lg text-[10px] md:text-xs font-bold text-gray-600 border border-gray-100 shadow-sm">{k.trim()}</span>
                 )) || <span className="text-gray-400 italic text-xs">No keywords</span>}
               </div>
            </div>

            {/* Card 3: Tags/Labels */}
             <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 flex flex-col justify-center shadow-sm relative group h-full">
               <div className="absolute top-3 right-3 md:top-4 md:right-4"><EditTrigger field="tagLabel" title="Tags" className="opacity-0 group-hover:opacity-100" /></div>
               <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tags / Labels</p>
               <div className="flex flex-wrap gap-2">
                 {entry.tagLabel?.split(', ').map((t, i) => (
                   <span key={i} className="px-2.5 py-1.5 bg-white rounded-lg text-[10px] md:text-xs font-bold text-purple-600 border border-purple-100 shadow-sm flex items-center gap-1">
                      <Tag size={10} className="text-purple-400" />
                      {t.trim()}
                   </span>
                 )) || <span className="text-gray-400 italic text-xs">No tags</span>}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <CitationDisplay label="In-Text Citation" citations={entry.inTextCitation} icon={Quote} />
            <CitationDisplay label="Bibliographic Reference" citations={entry.inReferenceCitation} icon={List} />
          </div>

          <AnalysisSection 
            title="Research Methodology" 
            field="researchMethodology" 
            value={entry.researchMethodology} 
            icon={Search} 
          />

          <AnalysisSection 
            title="Abstract" 
            field="abstract" 
            value={entry.abstract} 
            icon={FileText} 
            highlightColor="#E8FBFF"
          />

          <AnalysisSection 
            title="Executive Summary" 
            field="summary" 
            value={entry.summary} 
            icon={BookOpen} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
             <AnalysisSection 
                title="Key Strengths" 
                field="strength" 
                value={entry.strength} 
                icon={CheckCircle} 
                className="border-l-4 border-l-green-400"
                highlightColor="#F0FDF4"
             />
             <AnalysisSection 
                title="Limitations & Weaknesses" 
                field="weakness" 
                value={entry.weakness} 
                icon={XCircle} 
                className="border-l-4 border-l-red-400"
                highlightColor="#FEF2F2"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Globe className="w-5 h-5 text-[#0088A3]" />
                <h3 className="text-sm font-black text-[#003B47] uppercase tracking-wider">Unfamiliar Terminology</h3>
              </div>
              <div className="space-y-4">
                 {(() => {
                    const terms = safeJsonParseArray(entry.unfamiliarTerminology);
                    if (terms.length > 0) {
                      return terms.map((term: any, idx: number) => {
                        const explanation = typeof term.explanation === 'object' 
                            ? (term.explanation[viewLang] || term.explanation.en || term.explanation.id || '')
                            : term.explanation;
                        
                        // Updated to numbered list style
                        return (
                            <div key={idx} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors">
                              <div className="mt-1 min-w-[20px] h-[20px] bg-[#0088A3] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{idx + 1}</div>
                              <div className="overflow-hidden w-full">
                                  <p className="font-bold text-[#003B47] mb-1.5">{term.term}</p>
                                  <div className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{__html: explanation}} />
                              </div>
                            </div>
                        );
                      });
                    }
                    return <p className="text-gray-400 text-sm italic">No difficult terms identified.</p>;
                 })()}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Share2 className="w-5 h-5 text-[#0088A3]" />
                <h3 className="text-sm font-black text-[#003B47] uppercase tracking-wider">Supporting References</h3>
              </div>
              <div className="space-y-3">
                 {(() => {
                    const refs = safeJsonParseArray(entry.supportingReferences);
                    if (refs.length > 0) {
                       return refs.map((ref: any, idx: number) => {
                         const relevance = typeof ref.relevance === 'object'
                            ? (ref.relevance[viewLang] || ref.relevance.en || ref.relevance.id || '')
                            : ref.relevance;
                         return (
                            <div key={idx} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors">
                              <div className="mt-1 min-w-[20px] h-[20px] bg-[#0088A3] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{idx + 1}</div>
                              <div className="overflow-hidden">
                                 <p className="text-sm font-bold text-[#003B47] mb-1 leading-tight">{ref.citation}</p>
                                 <div className="text-xs text-gray-500 mb-1.5 leading-relaxed" dangerouslySetInnerHTML={{__html: relevance}} />
                                 {ref.link && (
                                    <a href={ref.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#0088A3] font-bold uppercase tracking-wider hover:underline hover:text-[#003B47] transition-colors">
                                      View Source <ExternalLink size={10} />
                                    </a>
                                 )}
                              </div>
                            </div>
                         );
                       });
                    }
                    return <p className="text-gray-400 text-sm italic">No references found.</p>;
                 })()}
              </div>
            </div>
          </div>

          <AnalysisSection 
            title="Actionable Tips For You" 
            field="tipsForYou" 
            value={entry.tipsForYou} 
            icon={Lightbulb} 
            highlightColor="#FFFBEB"
            className="border-l-4 border-l-yellow-400"
          />
      </div>
    </div>
  );
};

export default CollectionDetail;
