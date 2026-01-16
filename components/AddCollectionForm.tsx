
import React, { useState, useRef, useEffect } from 'react';
import { CollectionEntry } from '../types';
import { fetchFileData, fetchWebContent, fetchYoutubeTranscript, YoutubeExtractionResult } from '../services/spreadsheetService';
import { Readability } from '@mozilla/readability';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import Swal from 'sweetalert2';

// Import icons correctly from lucide-react
import { 
  ArrowLeft as ArrowLeftIcon, 
  Upload as UploadIcon, 
  Link as LinkIconComponent, 
  Save as SaveIcon, 
  ChevronDown as ChevronDownIcon, 
  Check as CheckIcon, 
  Search as SearchIconComponent, 
  AlertCircle as AlertCircleIcon, 
  X as XIcon, 
  Trash2 as Trash2Icon, 
  FileText as FileTextIcon, 
  RefreshCw as RefreshCwIcon, 
  Sparkles as SparklesIcon, 
  Database as DatabaseIcon, 
  Globe as GlobeIcon, 
  Type as TypeIconComponent, 
  Info as InfoIcon, 
  Youtube as YoutubeIcon, 
  PlayCircle as PlayCircleIcon 
} from 'lucide-react';

declare const pdfjsLib: any;
declare const Tesseract: any;

if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface AddCollectionFormProps {
  onBack: () => void;
  onSave: (entry: Partial<CollectionEntry> & { fileData?: string, fileName?: string, fileMimeType?: string, extractedText?: string }) => void;
}

export const INITIAL_CATEGORIES = [
  "Algorithm", "Blog Post", "Book", "Book Chapter", "Business Report", "Case Report",
  "Case Series", "Checklist", "Checklist Model", "Clinical Guideline", "Conference Paper",
  "Course Module", "Dataset", "Dissertation", "Exam Bank", "Form", "Framework",
  "Guideline (Non-Clinical)", "Idea Draft", "Image", "Infographic", "Journal Entry",
  "Lecture Note", "Magazine Article", "Manual", "Meeting Note", "Memo", "Meta-analysis",
  "Mindmap", "Model", "Newspaper Article", "Original Research", "Podcast", "Policy Brief",
  "Preprint", "Presentation Slide", "Proceedings", "Project Document", "Proposal",
  "Protocol", "Rapid Review", "Reflection", "Review Article", "Scoping Review",
  "Standard Operating Procedure (SOP)", "Study Guide", "Syllabus", "Summary",
  "Systematic Review", "Teaching Material", "Technical Report", "Template", "Thesis",
  "Toolkit", "Video", "Web Article", "Webpage Snapshot", "White Paper", "Working Paper", "Other"
];

const TYPES = ["Literature", "Task", "Personal", "Other"];

export const useMemoryList = (key: string, initialList: string[] = []) => {
  const [list, setList] = useState<string[]>(() => {
    const saved = localStorage.getItem(`smart_scholar_${key}`);
    return saved ? JSON.parse(saved) : initialList;
  });

  const addValue = (value: string) => {
    if (value && !list.includes(value)) {
      const newList = [value, ...list];
      setList(newList);
      localStorage.setItem(`smart_scholar_${key}`, JSON.stringify(newList));
    }
  };

  const addValues = (values: string[]) => {
    let changed = false;
    const newList = [...list];
    values.forEach(v => {
      if (v && !newList.includes(v)) {
        newList.unshift(v);
        changed = true;
      }
    });
    if (changed) {
      setList(newList);
      localStorage.setItem(`smart_scholar_${key}`, JSON.stringify(newList));
    }
  };

  return { list, addValue, addValues };
};

export const SmartSearchableDropdown: React.FC<{
  label: string;
  value: string;
  mandatory?: boolean;
  options: string[];
  placeholder: string;
  error?: boolean;
  onSelect: (val: string) => void;
}> = ({ label, value, mandatory, options, placeholder, error, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setSearch(e.key);
        setIsOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % (filtered.length || 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered.length > 0) {
          onSelect(filtered[highlightedIndex]);
        } else if (search.trim()) {
          onSelect(search.trim());
        }
        setIsOpen(false);
        setSearch('');
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-xs md:text-sm font-bold text-[#003B47] uppercase tracking-wide flex items-center justify-between">
        <span>{label} {mandatory && <span className="text-red-600 font-bold">*</span>}</span>
        {error && value === '' && (
          <span className="text-[10px] text-red-500 flex items-center gap-1 normal-case">
            <AlertCircleIcon size={12} /> Required
          </span>
        )}
      </label>
      <div className="relative">
        <div 
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`w-full p-3 md:p-4 bg-white rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between font-semibold outline-none focus:border-[#0088A3] ${
            error && value === '' ? 'border-red-400' : isOpen ? 'border-[#0088A3]' : 'border-gray-300'
          }`}
        >
          <span className={`${value ? "text-[#003B47]" : "text-gray-400"} text-sm md:text-base`}>
            {value || placeholder}
          </span>
          <ChevronDownIcon className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} size={18} />
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 bg-[#E8FBFF]">
              <div className="relative">
                <SearchIconComponent className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0088A3]" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  autoFocus
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border-2 border-gray-200 focus:border-[#0088A3] outline-none text-sm font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
              {filtered.length > 0 ? (
                filtered.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onSelect(opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all mb-1 ${
                      value === opt ? 'bg-[#0088A3] text-white' : idx === highlightedIndex ? 'bg-[#E8FBFF] text-[#0088A3]' : 'text-[#003B47] hover:bg-[#E8FBFF]'
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && <CheckIcon size={14} />}
                  </button>
                ))
              ) : search ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(search);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-black rounded-lg ${highlightedIndex === 0 ? 'bg-[#E8FBFF] text-[#0088A3]' : 'text-[#0088A3]'}`}
                >
                  + Add "{search}"
                </button>
              ) : (
                <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const MultiSelectSmartDropdown: React.FC<{
  label: string;
  values: string[];
  options: string[];
  placeholder: string;
  onValuesChange: (vals: string[]) => void;
}> = ({ label, values, options, placeholder, onValuesChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()) && !values.includes(opt));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onValuesChange(values.filter(v => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setSearch(e.key);
        setIsOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % (filtered.length || 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered.length > 0) {
          toggleValue(filtered[highlightedIndex]);
        } else if (search.trim()) {
          toggleValue(search.trim());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs md:text-sm font-bold text-[#003B47] uppercase tracking-wide">{label}</label>
        {values.length > 0 && (
          <button 
            type="button" 
            onClick={() => onValuesChange([])}
            className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase flex items-center gap-1 transition-all animate-in fade-in slide-in-from-right-1"
          >
            <Trash2Icon size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>
      
      <div className="relative">
        <div 
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`w-full min-h-[56px] p-2 bg-white rounded-xl border-2 transition-all cursor-pointer flex flex-wrap items-center gap-2 font-semibold outline-none focus:border-[#0088A3] ${
            isOpen ? 'border-[#0088A3]' : 'border-gray-300'
          }`}
        >
          {values.length === 0 && <span className="text-gray-400 px-2 text-sm md:text-base">{placeholder}</span>}
          {values.map(val => (
            <div key={val} className="flex items-center gap-2 px-3 py-1 bg-[#0088A311] border border-[#0088A333] text-[#0088A3] rounded-lg text-xs font-bold animate-in fade-in zoom-in duration-200">
              <span className="max-w-[150px] truncate">{val}</span>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValuesChange(values.filter(v => v !== val));
                }}
                className="p-0.5 hover:bg-[#0088A322] rounded-full transition-colors"
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
          <ChevronDownIcon className={`ml-auto mr-1 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0`} size={18} />
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 bg-[#E8FBFF]">
              <div className="relative">
                <SearchIconComponent className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0088A3]" size={16} />
                <input
                  type="text"
                  placeholder="Type to add..."
                  autoFocus
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border-2 border-gray-200 focus:border-[#0088A3] outline-none text-sm font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {filtered.length > 0 ? (
                filtered.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => toggleValue(opt)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all mb-1 ${
                      idx === highlightedIndex ? 'bg-[#E8FBFF] text-[#0088A3]' : 'text-[#003B47] hover:bg-[#E8FBFF]'
                    }`}
                  >
                    <span>{opt}</span>
                  </button>
                ))
              ) : search ? (
                <button
                  type="button"
                  onClick={() => toggleValue(search)}
                  className={`w-full text-left px-4 py-3 text-sm font-black rounded-lg ${highlightedIndex === 0 ? 'bg-[#E8FBFF] text-[#0088A3]' : 'text-[#0088A3]'}`}
                >
                  + Add "{search}"
                </button>
              ) : (
                <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase">No more options</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AddCollectionForm: React.FC<AddCollectionFormProps> = ({ onBack, onSave }) => {
  const [sourceMethod, setSourceMethod] = useState<'upload' | 'link'>('upload');
  const [uploadingFile, setUploadingFile] = useState<{ name: string, data: string, mimeType: string, extractedText?: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  
  const [isDriveLink, setIsDriveLink] = useState(false);
  const [isWebLink, setIsWebLink] = useState(false);
  const [isYoutubeLink, setIsYoutubeLink] = useState(false);
  const [showManualText, setShowManualText] = useState(false);
  const [manualText, setManualText] = useState('');
  const [syncedYoutubeUrl, setSyncedYoutubeUrl] = useState('');

  const categoryMem = useMemoryList('categories', INITIAL_CATEGORIES);
  const topicMem = useMemoryList('topics');
  const subTopicMem = useMemoryList('subtopics');
  const publisherMem = useMemoryList('publishers');
  const authorMem = useMemoryList('authors');
  const keywordMem = useMemoryList('keywords');
  const tagMem = useMemoryList('tags');

  const [formData, setFormData] = useState<Partial<CollectionEntry>>({
    category: '',
    type: '',
    topic: '',
    subTopic: '',
    authorName: '',
    title: '',
    publisher: '',
    year: '',
    keyword: '',
    tagLabel: '',
    sourceMethod: 'upload',
    sourceValue: '',
  });

  const [authors, setAuthors] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Auto-sync YouTube on paste
  useEffect(() => {
    if (sourceMethod === 'link' && isYoutubeLink && formData.sourceValue && formData.sourceValue !== syncedYoutubeUrl) {
        handleSyncYoutube(formData.sourceValue);
    }
  }, [formData.sourceValue, isYoutubeLink, sourceMethod]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'year') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }
    
    if (name === 'sourceValue' && sourceMethod === 'link') {
       const isDrive = value.includes('drive.google.com') || value.includes('docs.google.com');
       const isYoutube = value.includes('youtube.com') || value.includes('youtu.be');
       
       setIsDriveLink(isDrive);
       setIsYoutubeLink(isYoutube);
       setIsWebLink(!isDrive && !isYoutube && (value.startsWith('http://') || value.startsWith('https://')));
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSourceMethodChange = (method: 'upload' | 'link') => {
    setSourceMethod(method);
    setFormData(prev => ({ ...prev, sourceMethod: method, sourceValue: '' }));
    setUploadingFile(null);
    setIsDriveLink(false);
    setIsWebLink(false);
    setIsYoutubeLink(false);
    setShowManualText(false);
    setManualText('');
    setSyncedYoutubeUrl('');
    setAuthors([]);
    setKeywords([]);
    setTags([]);
  };

  const processFileContent = async (base64Full: string, fileName: string, mimeType: string) => {
    let extractedText = "";
    const base64Clean = base64Full.split(',')[1] || base64Full;
    const binary = atob(base64Clean);
    const arrayBuffer = new ArrayBuffer(binary.length);
    const uint8 = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binary.length; i++) uint8[i] = binary.charCodeAt(i);

    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (fileExt === 'pdf' || mimeType === 'application/pdf') {
      setExtractionProgress("Reading PDF...");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item: any) => item.str).join(" ") + "\n\n";
      }
    } else if (fileExt === 'docx') {
       const result = await mammoth.extractRawText({ arrayBuffer });
       extractedText = result.value;
    } else if (['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
       const workbook = XLSX.read(arrayBuffer, { type: 'array' });
       extractedText = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    } else if (mimeType.startsWith('image/')) {
       const blob = new Blob([arrayBuffer], { type: mimeType });
       const { data: { text } } = await Tesseract.recognize(blob, 'eng+ind');
       extractedText = text;
    } else if (fileExt === 'txt') {
       extractedText = new TextDecoder().decode(uint8);
    }
    
    return extractedText.trim();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const extractedText = await processFileContent(base64, file.name, file.type);
          
          setUploadingFile({ 
            name: file.name, 
            mimeType: file.type, 
            data: base64,
            extractedText: extractedText || undefined 
          });
          
          setFormData(prev => ({ 
            ...prev, 
            sourceValue: file.name,
            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name
          }));
          setIsProcessingFile(false);
        };
        reader.readAsDataURL(file);
    } catch (err) {
        setIsProcessingFile(false);
    }
  };

  const handleSyncDrive = async () => {
    if (!formData.sourceValue) return;
    setIsProcessingFile(true);
    setExtractionProgress("Connecting to Drive...");
    try {
      const result = await fetchFileData(formData.sourceValue);
      if (!result) throw new Error("Gagal mengambil file Drive.");
      const extractedText = await processFileContent(result.data, result.fileName, result.mimeType);
      setUploadingFile({ name: result.fileName, mimeType: result.mimeType, data: result.data, extractedText: extractedText || undefined });
      setFormData(prev => ({ ...prev, title: result.fileName.substring(0, result.fileName.lastIndexOf('.')) || result.fileName }));
      Swal.fire('Success', 'Drive synced!', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSyncWeb = async () => {
    if (!formData.sourceValue) return;
    setIsProcessingFile(true);
    setExtractionProgress("Fetching web content...");
    try {
      const html = await fetchWebContent(formData.sourceValue);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const reader = new Readability(doc);
      const article = reader.parse();
      if (!article || !article.textContent) throw new Error("Gagal mengekstrak.");
      setUploadingFile({ name: article.title || "Web Page", mimeType: "text/plain", data: "", extractedText: article.textContent });
      setFormData(prev => ({ ...prev, title: article.title || prev.title }));
      Swal.fire('Success', 'Article synced!', 'success');
    } catch (err: any) {
      Swal.fire('Warning', 'Gagal sinkronisasi otomatis. Gunakan mode MANUAL.', 'warning');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSyncYoutube = async (url: string) => {
    setIsProcessingFile(true);
    setExtractionProgress("Advanced Video Metadata Extraction...");

    try {
      const result: YoutubeExtractionResult = await fetchYoutubeTranscript(url);
      
      setUploadingFile({
        name: result.title,
        mimeType: "text/plain",
        data: "",
        extractedText: "" 
      });

      // Update Form Data
      setFormData(prev => ({
        ...prev,
        title: result.title,
        category: "Video",
        publisher: result.publisher || "YouTube",
        year: result.year || "",
        keyword: result.keywords || ""
      }));

      // Update Authors State
      if (result.author) {
        setAuthors([result.author]);
      }

      // Update Keywords State (Untuk UI MultiSelect)
      if (result.keywords) {
        // Membersihkan keywords dari karakter aneh dan memisahkan koma
        const kws = result.keywords
          .split(',')
          .map((k: string) => k.trim())
          .filter(k => k.length > 0 && k !== result.author); // Filter out empty or duplicate of author
        setKeywords(kws);
      }

      setSyncedYoutubeUrl(url);

      Swal.fire({
        toast: true,
        position: 'top-end',
        title: 'Metadata Deep-Sync Complete!',
        icon: 'success',
        showConfirmButton: false,
        timer: 3000
      });
      
    } catch (err: any) {
      setSyncedYoutubeUrl(url); 
      console.error(err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: 'Partial Sync',
        text: 'Standard metadata retrieved.',
        icon: 'info',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) return;
    setUploadingFile(prev => ({
        name: formData.title || prev?.name || "Content",
        mimeType: "text/plain",
        data: "",
        extractedText: manualText
    }));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Content saved to buffer',
      showConfirmButton: false,
      timer: 2000
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.type || !formData.topic) {
      setShowErrors(true);
      return;
    }

    categoryMem.addValue(formData.category!);
    topicMem.addValue(formData.topic!);
    if (formData.subTopic) subTopicMem.addValue(formData.subTopic);
    if (formData.publisher) publisherMem.addValue(formData.publisher);
    authorMem.addValues(authors);
    keywordMem.addValues(keywords);
    tagMem.addValues(tags);

    const submissionData = { 
      ...formData, 
      id: crypto.randomUUID(),
      createdDateTime: new Date().toISOString(),
      authorName: authors.join(', '),
      keyword: keywords.join(', '),
      tagLabel: tags.join(', '),
      fileData: uploadingFile?.data,
      fileName: uploadingFile?.name,
      fileMimeType: uploadingFile?.mimeType,
      extractedText: manualText || uploadingFile?.extractedText
    };

    onSave(submissionData);
  };

  const inputClasses = "w-full p-3 md:p-4 bg-white rounded-xl border-2 border-gray-300 focus:border-[#0088A3] outline-none text-[#003B47] font-semibold text-sm md:text-base transition-all";
  const labelClasses = "text-xs md:text-sm font-bold text-[#003B47] uppercase block mb-2";

  return (
    <div className="w-full h-full flex flex-col bg-white md:rounded-3xl md:shadow-lg border border-gray-200 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative">
      
      {isProcessingFile && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <RefreshCwIcon className="w-12 h-12 text-[#0088A3] animate-spin mb-4" />
            <p className="text-[#003B47] font-black uppercase tracking-tight text-center px-4">{extractionProgress}</p>
        </div>
      )}

      <div className="flex-none p-4 md:p-6 border-b-2 border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#E8FBFF] rounded-xl text-[#0088A3]">
            <ArrowLeftIcon className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <h2 className="text-xl md:text-2xl font-black text-[#003B47]">Add Collection</h2>
        </div>
        <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 md:py-3 bg-[#0088A3] text-white rounded-xl font-black hover:bg-[#003B47] transition-all shadow-lg active:scale-95">
          <SaveIcon className="w-5 h-5" strokeWidth={2.5} />
          <span>SAVE</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-8 pb-32">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black uppercase text-[#0088A3]">1. Source</h3>
                <div className="inline-flex p-1 bg-gray-100 rounded-xl">
                  <button type="button" onClick={() => handleSourceMethodChange('upload')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${sourceMethod === 'upload' ? 'bg-white text-[#0088A3] shadow-sm' : 'text-gray-500'}`}>UPLOAD</button>
                  <button type="button" onClick={() => handleSourceMethodChange('link')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${sourceMethod === 'link' ? 'bg-white text-[#0088A3] shadow-sm' : 'text-gray-500'}`}>LINK</button>
                </div>
              </div>
              
              <div className="mt-4">
                {sourceMethod === 'upload' ? (
                  <div className="space-y-4">
                    <div className={`relative border-4 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all bg-gray-50 group ${showErrors && !uploadingFile ? 'border-red-300' : 'border-gray-200'}`}>
                      <input type="file" className="hidden" id="file-upload" onChange={handleFileChange} />
                      <label htmlFor="file-upload" className="cursor-pointer text-center w-full">
                        <UploadIcon className="w-10 h-10 mx-auto mb-4 text-[#0088A3] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                        <p className="text-[#003B47] font-bold">Tap to choose file</p>
                        <p className="text-xs text-gray-500 mt-2">Support: PDF, DOCX, XLSX, Images, TXT</p>
                      </label>
                    </div>
                    {uploadingFile && (
                      <div className="flex items-center justify-between p-4 bg-[#E8FBFF] rounded-2xl border-2 border-[#0088A333] animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 truncate">
                          <FileTextIcon className="text-[#0088A3]" />
                          <span className="text-sm font-bold text-[#003B47] truncate">{uploadingFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setUploadingFile(null)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg"><XIcon size={20} /></button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      {isYoutubeLink ? <YoutubeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" /> : <LinkIconComponent className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0088A3]" />}
                      <input type="url" name="sourceValue" placeholder="Paste link here..." className={`${inputClasses} pl-12 h-14`} value={formData.sourceValue} onChange={handleChange} />
                    </div>
                    
                    <div className="flex gap-2">
                        {isDriveLink && !uploadingFile && <button type="button" onClick={handleSyncDrive} className="flex-1 p-4 bg-[#003B47] text-white rounded-2xl font-black hover:bg-[#0088A3] transition-all">SYNC DRIVE</button>}
                        {isWebLink && !uploadingFile && <button type="button" onClick={handleSyncWeb} className="flex-1 p-4 bg-[#be2690] text-white rounded-2xl font-black hover:bg-[#003B47] transition-all">SYNC WEB</button>}
                        {!isYoutubeLink && !uploadingFile && <button type="button" onClick={() => setShowManualText(!showManualText)} className="p-4 bg-gray-100 rounded-2xl text-[#003B47] hover:bg-gray-200 transition-all" title="Manual Text Input"><TypeIconComponent /></button>}
                    </div>

                    {(showManualText && !isYoutubeLink) && (
                      <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-300 animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-black text-[#0088A3] uppercase">Content Input</label>
                          {manualText && <span className="text-[9px] text-green-600 font-bold flex items-center gap-1"><CheckIcon size={10}/> Ready</span>}
                        </div>
                        <textarea placeholder="Paste content here..." value={manualText} onChange={(e) => setManualText(e.target.value)} className="w-full h-40 p-4 bg-white rounded-xl border-none outline-none text-sm font-medium resize-none focus:ring-2 focus:ring-[#0088A3]" />
                        <button type="button" onClick={handleManualTextSubmit} disabled={!manualText.trim()} className="w-full py-3 bg-[#0088A3] text-white rounded-xl font-bold disabled:opacity-50">CONFIRM CONTENT</button>
                      </div>
                    )}
                    
                    {uploadingFile && (
                      <div className="flex items-center justify-between p-4 bg-[#E8FBFF] rounded-2xl border-2 border-[#0088A333] animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 truncate">
                          <CheckIcon className="text-[#0088A3]" strokeWidth={3} />
                          <span className="text-sm font-bold text-[#003B47] truncate">{uploadingFile.name}</span>
                        </div>
                        <button type="button" onClick={() => {setUploadingFile(null); setShowManualText(false); setManualText(''); setSyncedYoutubeUrl('');}} className="text-red-500 hover:bg-red-50 p-1 rounded-lg"><XIcon size={20} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-base font-black uppercase text-[#0088A3]">2. Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SmartSearchableDropdown label="Type" mandatory value={formData.type!} options={TYPES} placeholder="Select type..." error={showErrors} onSelect={(val) => setFormData(prev => ({ ...prev, type: val }))} />
                <SmartSearchableDropdown label="Category" mandatory value={formData.category!} options={categoryMem.list} placeholder="Select category..." error={showErrors} onSelect={(val) => setFormData(prev => ({ ...prev, category: val }))} />
                <SmartSearchableDropdown label="Topic" mandatory value={formData.topic!} options={topicMem.list} placeholder="Main topic" error={showErrors} onSelect={(val) => setFormData(prev => ({ ...prev, topic: val }))} />
                <SmartSearchableDropdown label="Sub Topic" value={formData.subTopic!} options={subTopicMem.list} placeholder="Sub topic" onSelect={(val) => setFormData(prev => ({ ...prev, subTopic: val }))} />
              </div>
            </section>
          </div>
          
          <section className="space-y-8 pt-10 border-t-2 border-gray-100">
            <h3 className="text-base font-black uppercase text-[#0088A3]">3. Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2"><label className={labelClasses}>Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses} placeholder="Enter full title" /></div>
                <MultiSelectSmartDropdown label="Author Name" values={authors} options={authorMem.list} placeholder="Authors..." onValuesChange={setAuthors} />
                <SmartSearchableDropdown label="Publisher" value={formData.publisher!} options={publisherMem.list} placeholder="Publisher" onSelect={(val) => setFormData(prev => ({ ...prev, publisher: val }))} />
                <div className="space-y-2"><label className={labelClasses}>Year</label><input type="text" name="year" value={formData.year || ''} onChange={handleChange} maxLength={4} className={inputClasses} placeholder="YYYY" /></div>
              </div>
              <div className="space-y-6">
                <MultiSelectSmartDropdown label="Keyword" values={keywords} options={keywordMem.list} placeholder="Keywords..." onValuesChange={setKeywords} />
                <MultiSelectSmartDropdown label="Tag / Label" values={tags} options={tagMem.list} placeholder="Tags..." onValuesChange={setTags} />
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default AddCollectionForm;
