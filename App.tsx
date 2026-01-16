
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ResearchPanel from './components/ResearchPanel';
import AddCollectionForm from './components/AddCollectionForm';
import CollectionDetail from './components/CollectionDetail';
import { MenuId, CollectionEntry } from './types';
import { MOCK_COLLECTIONS, COLORS, TYPES } from './constants';
import { Search, Bell, Plus, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, FileText, ChevronLeft, ChevronRight, Trash2, Heart, Bookmark as BookmarkIcon, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { saveCollectionToGAS, fetchCollections, deleteCollectionsFromGAS, updateCollectionStatusInGAS, updateCollectionInGAS } from './services/spreadsheetService';
import Swal from 'sweetalert2';

type SortConfig = {
  key: keyof CollectionEntry | null;
  direction: 'asc' | 'desc' | 'default';
};

const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuId>('Library');
  const [collections, setCollections] = useState<CollectionEntry[]>(MOCK_COLLECTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<CollectionEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'default' });
  
  // Ref for the main content container to handle scrolling
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Initial Data Sync (On App Open / Refresh / Reload)
  const syncData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCollections();
      // Only update if data is valid array (even empty). If null, it means error, so keep current state (mock or prev).
      if (data !== null) {
        setCollections(data);
      }
    } catch (err) {
      console.error("Initial sync failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  // Scroll to top when activeMenu changes (Module Independence)
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeMenu]);

  // Reset selection & pagination when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, selectedType, sortConfig, activeMenu]);

  // Handle Sort Toggle
  const handleSort = (key: keyof CollectionEntry) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: 'default' };
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...collections];

    if (activeMenu === 'Favourite') {
      data = data.filter(item => item.isFavourite);
    } else if (activeMenu === 'Bookmark') {
      data = data.filter(item => item.isBookmarked);
    }

    if (selectedType !== 'All') {
      data = data.filter(item => item.type === selectedType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      
      data = data.filter(item => {
        const searchableContent = [
          item.title,
          item.authorName,
          item.type,
          item.category,
          item.topic,
          item.subTopic,
          item.publisher,
          item.year,
          item.keyword,
          item.tagLabel,
          item.abstract,
          item.summary,
          item.researchMethodology,
          item.strength,
          item.weakness,
          item.unfamiliarTerminology,
          item.inTextCitation,
          item.inReferenceCitation,
          item.tipsForYou,
          ...(item.supportingReferences || [])
        ]
        .filter(val => val !== undefined && val !== null)
        .join(' ')
        .toLowerCase();

        return searchableContent.includes(q);
      });
    }

    if (sortConfig.key && sortConfig.direction !== 'default') {
      data.sort((a, b) => {
        const valA = String(a[sortConfig.key!] || '').toLowerCase();
        const valB = String(b[sortConfig.key!] || '').toLowerCase();
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [collections, activeMenu, searchQuery, selectedType, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);

  const selectedItemsData = useMemo(() => 
    collections.filter(item => selectedIds.has(item.id)), 
  [collections, selectedIds]);

  const areAllSelectedFav = selectedItemsData.length > 0 && selectedItemsData.every(item => item.isFavourite);
  const areAllSelectedBookmarked = selectedItemsData.length > 0 && selectedItemsData.every(item => item.isBookmarked);

  const toggleSelectAll = () => {
    const currentPageIds = paginatedData.map(item => item.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedIds.has(id));

    const nextSelected = new Set(selectedIds);
    if (allCurrentPageSelected) {
      currentPageIds.forEach(id => nextSelected.delete(id));
    } else {
      currentPageIds.forEach(id => nextSelected.add(id));
    }
    setSelectedIds(nextSelected);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSelected = new Set(selectedIds);
    if (nextSelected.has(id)) {
      nextSelected.delete(id);
    } else {
      nextSelected.add(id);
    }
    setSelectedIds(nextSelected);
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof CollectionEntry }) => {
    if (sortConfig.key !== columnKey || sortConfig.direction === 'default') return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-[#0088A3]" /> : <ArrowDown size={14} className="text-[#0088A3]" />;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleSaveCollection = async (entry: Partial<CollectionEntry> & { fileData?: string, fileName?: string, fileMimeType?: string }) => {
    setIsSaving(true);
    const newEntry = entry as CollectionEntry;
    setCollections(prev => [newEntry, ...prev]);
    
    try {
      await saveCollectionToGAS(entry);
      setIsAddingCollection(false);
    } catch (err) {
      alert("Failed to save collection to database.");
      syncData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, field: 'isFavourite' | 'isBookmarked', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentItem = collections.find(c => c.id === id);
    if (!currentItem) return;

    const newValue = !currentItem[field];
    
    setCollections(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: newValue } : item
    ));

    updateCollectionStatusInGAS(id, field, newValue);
  };

  // Updated to handle both single field updates and bulk updates (partial object)
  const handleUpdateEntry = async (id: string, updates: Partial<CollectionEntry>) => {
    setCollections(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, updatedDateTime: new Date().toISOString() } : item
    ));
    
    if (viewingEntry && viewingEntry.id === id) {
       setViewingEntry(prev => prev ? { ...prev, ...updates, updatedDateTime: new Date().toISOString() } : null);
    }

    // Call the bulk update service
    updateCollectionInGAS(id, updates);
  };

  const showThemeAlert = (type: 'delete' | 'success', title: string, text: string) => {
    return Swal.fire({
      title: title,
      text: text,
      icon: type === 'delete' ? 'warning' : 'success',
      showCancelButton: type === 'delete',
      confirmButtonText: type === 'delete' ? 'Yes, delete it!' : 'Great!',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-[2.5rem] p-8 shadow-2xl border-4 border-white w-[90vw] md:w-auto',
        title: 'text-[#003B47] font-black text-xl md:text-2xl mb-2 font-sans',
        htmlContainer: 'text-gray-500 font-medium text-sm md:text-base font-sans',
        confirmButton: type === 'delete' 
          ? 'bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all mx-2 active:scale-95 text-sm md:text-base' 
          : 'bg-[#0088A3] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-[#003B47] transition-all active:scale-95 text-sm md:text-base',
        cancelButton: 'bg-gray-100 text-gray-500 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all mx-2 active:scale-95 text-sm md:text-base',
        actions: 'mt-4 gap-2 md:gap-4 flex-col md:flex-row'
      },
      backdrop: `rgba(0, 59, 71, 0.4) backdrop-blur-sm`
    });
  };

  const handleBulkAction = async (action: 'delete' | 'favorite' | 'bookmark') => {
    const idsToProcess: string[] = Array.from(selectedIds) as string[];
    
    if (action === 'delete') {
      const result = await showThemeAlert(
        'delete',
        'Delete Selected Items?',
        `You are about to delete ${idsToProcess.length} item(s). This action cannot be undone.`
      );

      if (result.isConfirmed) {
        setCollections(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        deleteCollectionsFromGAS(idsToProcess);
        showThemeAlert('success', 'Deleted!', 'Selected items have been deleted.');
      }
    } else {
      const field = action === 'favorite' ? 'isFavourite' : 'isBookmarked';
      const hasAtLeastOneInactive = selectedItemsData.some(item => !item[field]);
      const targetValue = hasAtLeastOneInactive;

      setCollections(prev => prev.map(item => 
        selectedIds.has(item.id) ? { ...item, [field]: targetValue } : item
      ));
      
      idsToProcess.forEach(id => {
        updateCollectionStatusInGAS(id as string, field, targetValue);
      });
      setSelectedIds(new Set());
    }
  };

  const handleDeleteWithConfirmation = async (id: string) => {
    const result = await showThemeAlert(
      'delete',
      'Delete Collection?',
      "This collection will be permanently removed from your library."
    );

    if (result.isConfirmed) {
      setCollections(prev => prev.filter(item => item.id !== id));
      deleteCollectionsFromGAS([id]);
      setViewingEntry(null);
      showThemeAlert('success', 'Deleted!', 'This collection has been removed.');
    }
  };

  const isFullPageModalOpen = isAddingCollection || !!viewingEntry;

  return (
    <div className="flex min-h-screen bg-white">
      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative group">
            <img 
              src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
              className="w-16 md:w-24 h-16 md:h-24 object-contain animate-spin" 
              style={{ animationDuration: '3s' }}
              alt="Smart Scholar Icon"
            />
            <div className="absolute inset-0 bg-[#0088A3] opacity-20 blur-3xl rounded-full animate-pulse" />
          </div>
          <div className="mt-6 md:mt-10 flex flex-col items-center gap-2 md:gap-3">
            <p className="text-[#0088A3] font-bold text-[9px] uppercase tracking-widest flex items-center gap-2">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              Synchronizing Data...
            </p>
          </div>
        </div>
      )}

      <Sidebar activeMenu={activeMenu} onMenuChange={(id) => {
        setActiveMenu(id);
        setIsAddingCollection(false);
        setViewingEntry(null);
        setSelectedType('All');
      }} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F9FA]">
        <header className="sticky top-0 z-[50] w-full bg-white/90 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[#0088A311] gap-3 md:gap-0 min-h-[5rem]">
          <div className="flex-shrink-0 text-left md:ml-0 ml-12 transition-all">
            <p className="text-gray-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Welcome back,</p>
            <h1 className="text-base md:text-lg font-bold text-[#003B47] leading-none">Prof. Ray!</h1>
          </div>
          
          <div className="flex items-center justify-end gap-2 md:gap-4 flex-shrink-0">
            <button 
              onClick={syncData}
              className={`p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-gray-50 text-gray-400 hover:text-[#0088A3] transition-all shadow-sm`}
              title="Sync Data"
            >
              <RefreshCw className="w-[18px] h-[18px] md:w-5 md:h-5" />
            </button>
            <button className="p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-gray-50 text-gray-400 hover:text-[#0088A3] transition-all relative shadow-sm">
              <Bell className="w-[18px] h-[18px] md:w-5 md:h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: COLORS.accent }}></span>
            </button>
            <button className="flex items-center p-1 rounded-full bg-white hover:shadow-md transition-all border border-transparent hover:border-[#0088A333]">
              <img src="https://picsum.photos/seed/user/100" className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-[#0088A322]" alt="Profile" />
            </button>
          </div>
        </header>

        <div 
          ref={mainContentRef}
          className={`flex-1 ${isFullPageModalOpen ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar p-4 md:p-8'}`}
        >
          <div className={`flex-1 ${isFullPageModalOpen ? 'h-full p-0 md:p-8' : ''}`}>
            {viewingEntry ? (
              <div className="h-full relative">
                <CollectionDetail 
                  entry={viewingEntry} 
                  onBack={() => setViewingEntry(null)} 
                  onDelete={handleDeleteWithConfirmation} 
                  onUpdate={handleUpdateEntry}
                />
              </div>
            ) : isAddingCollection ? (
              <div className="h-full relative">
                {isSaving && (
                  <div className="absolute inset-0 z-[200] bg-white/50 backdrop-blur-md rounded-3xl flex items-center justify-center">
                    <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 w-3/4 md:w-auto">
                      <div className="relative">
                        <img 
                          src="https://lh3.googleusercontent.com/d/1mk9IJ6hJleRZzWiuXaGCfuBuLRul4Xgj" 
                          className="w-12 h-12 md:w-16 md:h-16 object-contain animate-spin" 
                          style={{ animationDuration: '3s' }}
                          alt="Saving"
                        />
                        <div className="absolute inset-0 bg-[#0088A3] opacity-10 blur-xl rounded-full animate-pulse" />
                      </div>
                      <p className="text-[#003B47] font-black text-[10px] md:text-xs uppercase tracking-widest text-center">
                        Uploading to Library Database...<br/>
                        <span className="text-[9px] md:text-[10px] text-gray-400 font-bold">Please wait a moment</span>
                      </p>
                    </div>
                  </div>
                )}
                <AddCollectionForm onBack={() => setIsAddingCollection(false)} onSave={handleSaveCollection} />
              </div>
            ) : activeMenu === 'Research' ? (
              <ResearchPanel />
            ) : (
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                  <div className="relative group w-full md:w-96 order-2 md:order-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0088A3] transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search across entire content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-200 focus:border-[#0088A3] focus:ring-0 transition-all outline-none w-full font-semibold text-[#003B47] text-sm md:text-base"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between md:justify-end gap-3 order-1 md:order-2">
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-1 md:gap-2 p-1 bg-white rounded-xl md:rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-right-4 shadow-sm">
                        <span className="px-2 md:px-4 text-[9px] md:text-[10px] font-black text-[#0088A3] uppercase tracking-widest whitespace-nowrap">{selectedIds.size} Selected</span>
                        <div className="flex items-center">
                          <button 
                            onClick={() => handleBulkAction('favorite')} 
                            className="p-1.5 md:p-2 hover:bg-[#be269011] text-gray-400 hover:text-[#be2690] rounded-lg md:rounded-xl transition-all" 
                            title={areAllSelectedFav ? "Bulk Unfavourite" : "Bulk Favourite"}
                          >
                            <Heart className={`w-4 h-4 md:w-[18px] md:h-[18px] ${areAllSelectedFav ? "text-[#be2690] fill-[#be2690]" : ""}`} fill={areAllSelectedFav ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('bookmark')} 
                            className="p-1.5 md:p-2 hover:bg-[#0088A311] text-gray-400 hover:text-[#0088A3] rounded-lg md:rounded-xl transition-all" 
                            title={areAllSelectedBookmarked ? "Bulk Unbookmark" : "Bulk Bookmark"}
                          >
                            <BookmarkIcon className={`w-4 h-4 md:w-[18px] md:h-[18px] ${areAllSelectedBookmarked ? "text-[#0088A3] fill-[#0088A3]" : ""}`} fill={areAllSelectedBookmarked ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => handleBulkAction('delete')} className="p-1.5 md:p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg md:rounded-xl transition-all" title="Delete">
                            <Trash2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                          </button>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => setIsAddingCollection(true)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:px-6 bg-[#0088A3] text-white rounded-xl text-xs md:text-sm font-black hover:bg-[#003B47] transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={3} />
                      <span>ADD COLLECTION</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-2 overflow-x-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  <button 
                    onClick={() => setSelectedType('All')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${selectedType === 'All' ? 'bg-[#0088A3] text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-[#0088A311]'}`}
                  >
                    All
                  </button>
                  {TYPES.map(type => (
                    <button 
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${selectedType === type ? 'bg-[#0088A3] text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-[#0088A311]'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-4 py-3 md:px-6 md:py-4 w-10">
                            <button 
                              onClick={toggleSelectAll}
                              className={`p-1 rounded-md transition-all ${
                                paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item.id)) 
                                ? 'text-[#0088A3]' : 'text-gray-300'
                              }`}
                            >
                              {paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item.id)) 
                                ? <CheckSquare size={18} strokeWidth={2.5} /> 
                                : <Square size={18} strokeWidth={2.5} />}
                            </button>
                          </th>
                          {[
                            { label: 'Created At', key: 'createdDateTime' },
                            { label: 'Title', key: 'title' },
                            { label: 'Author', key: 'authorName' },
                            { label: 'Type', key: 'type' },
                            { label: 'Category', key: 'category' },
                            { label: 'Topic', key: 'topic' },
                            { label: 'Year', key: 'year' }
                          ].map((col) => (
                            <th 
                              key={col.key}
                              onClick={() => handleSort(col.key as keyof CollectionEntry)}
                              className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-black text-[#003B47] uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                {col.label}
                                <SortIcon columnKey={col.key as keyof CollectionEntry} />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedData.length > 0 ? (
                          paginatedData.map((item) => (
                            <tr 
                              key={item.id} 
                              onClick={() => setViewingEntry(item)}
                              className="hover:bg-[#E8FBFF33] transition-colors group cursor-pointer"
                            >
                              <td className="px-4 py-3 md:px-6 md:py-4" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => toggleSelect(item.id, e)}
                                  className={`p-1 rounded-md transition-all ${selectedIds.has(item.id) ? 'text-[#0088A3]' : 'text-gray-200 group-hover:text-gray-300'}`}
                                >
                                  {selectedIds.has(item.id) ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2.5} />}
                                </button>
                              </td>
                              <td className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs text-gray-400 font-medium whitespace-nowrap">
                                {formatDateTime(item.createdDateTime)}
                              </td>
                              <td className="px-4 py-3 md:px-6 md:py-4 min-w-[200px] md:min-w-[320px] lg:min-w-[500px]">
                                <div className="flex items-center gap-2 md:gap-3 w-full">
                                  <div className="shrink-0">
                                    {item.sourceMethod === 'upload' ? <FileText size={14} className="text-[#0088A3]" /> : <ExternalLink size={14} className="text-[#be2690]" />}
                                  </div>
                                  <span className="text-xs md:text-sm font-bold text-[#003B47] line-clamp-1 break-all md:break-normal group-hover:text-[#0088A3] transition-colors" title={item.title}>
                                    {item.title || "Untitled Collection"}
                                  </span>
                                  
                                  <div className="flex items-center gap-1 ml-auto shrink-0">
                                    <button 
                                      onClick={(e) => handleToggleStatus(item.id, 'isFavourite', e)}
                                      className="p-1 hover:bg-[#be269011] rounded-md transition-colors"
                                      title={item.isFavourite ? "Unfavourite" : "Favourite"}
                                    >
                                      <Heart size={14} className={item.isFavourite ? "text-[#be2690] fill-[#be2690]" : "text-gray-200 group-hover:text-gray-300"} />
                                    </button>
                                    <button 
                                      onClick={(e) => handleToggleStatus(item.id, 'isBookmarked', e)}
                                      className="p-1 hover:bg-[#0088A311] rounded-md transition-colors"
                                      title={item.isBookmarked ? "Unbookmark" : "Bookmark"}
                                    >
                                      <BookmarkIcon size={14} className={item.isBookmarked ? "text-[#0088A3] fill-[#0088A3]" : "text-gray-200 group-hover:text-gray-300"} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 md:px-6 md:py-4 text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">{item.authorName || '-'}</td>
                              <td className="px-4 py-3 md:px-6 md:py-4">
                                <span className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter ${
                                  item.type === 'Literature' ? 'bg-blue-50 text-blue-600' :
                                  item.type === 'Task' ? 'bg-orange-50 text-orange-600' :
                                  item.type === 'Personal' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.type || 'Other'}
                                </span>
                              </td>
                              <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-gray-500 font-semibold whitespace-nowrap">{item.category || '-'}</td>
                              <td className="px-4 py-3 md:px-6 md:py-4 text-xs text-gray-500 font-semibold whitespace-nowrap">{item.topic || '-'}</td>
                              <td className="px-4 py-3 md:px-6 md:py-4 text-xs md:text-sm text-[#003B47] font-bold">{item.year || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-20 text-center">
                              <div className="flex flex-col items-center justify-center opacity-40">
                                <Search className="w-9 h-9 md:w-12 md:h-12 mb-4" />
                                <h3 className="text-base md:text-lg font-bold text-[#003B47]">No matching records</h3>
                                <p className="text-xs md:text-sm">Try adjusting your search or filters</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredAndSortedData.length > 0 && (
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
                        Showing <span className="text-[#003B47]">{Math.min(filteredAndSortedData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to <span className="text-[#003B47]">{Math.min(filteredAndSortedData.length, currentPage * ITEMS_PER_PAGE)}</span> of <span className="text-[#003B47]">{filteredAndSortedData.length}</span> results
                      </p>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 md:p-2 rounded-lg text-[#003B47] hover:bg-[#0088A311] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                          >
                            <ChevronLeft className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                          </button>
                          
                          <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                              const page = i + 1;
                              if (totalPages > 5) {
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPage(page)}
                                      className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] md:text-xs font-black transition-all ${currentPage === page ? 'bg-[#0088A3] text-white shadow-md shadow-[#0088A333]' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                      {page}
                                    </button>
                                  );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                  return <span key={page} className="text-gray-300 text-xs px-1">...</span>;
                                }
                                return null;
                              }
                              
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] md:text-xs font-black transition-all ${currentPage === page ? 'bg-[#0088A3] text-white shadow-md shadow-[#0088A333]' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>

                          <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 md:p-2 rounded-lg text-[#003B47] hover:bg-[#0088A311] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                          >
                            <ChevronRight className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
