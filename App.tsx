
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ResearchPanel from './components/ResearchPanel';
import AddCollectionForm from './components/AddCollectionForm';
import CollectionDetail from './components/CollectionDetail';
import { MenuId, CollectionEntry } from './types';
import { MOCK_COLLECTIONS, COLORS, TYPES } from './constants';
import { Search, Bell, Plus, Loader2, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Key, ShieldCheck, ExternalLink, ChevronLeft, ChevronRight, Heart, Bookmark as BookmarkIcon, Settings, X, PlusCircle, Trash2 } from 'lucide-react';
import { fetchCollections, fetchSettings, saveSettingsToGAS, saveCollectionToGAS, deleteCollectionsFromGAS, updateCollectionStatusInGAS, updateCollectionInGAS } from './services/spreadsheetService';
import Swal from 'sweetalert2';

const SettingsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  keys: string[]; 
  onSave: (keys: string[]) => void 
}> = ({ isOpen, onClose, keys, onSave }) => {
  const [localKeys, setLocalKeys] = useState<string[]>(Array.isArray(keys) ? keys : []);
  const [newKey, setNewKey] = useState('');

  useEffect(() => { setLocalKeys(Array.isArray(keys) ? keys : []); }, [keys]);

  if (!isOpen) return null;

  const addKey = () => {
    if (newKey.trim() && !localKeys.includes(newKey.trim())) {
      setLocalKeys([...localKeys, newKey.trim()]);
      setNewKey('');
    }
  };

  const removeKey = (index: number) => {
    setLocalKeys(localKeys.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localKeys);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#003B47]/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#003B47]">Vault Settings</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Multi-Key Management</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X /></button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[#0088A3] uppercase tracking-widest">Add Alternative Gemini Key</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Paste API Key here..."
                className="flex-1 p-4 bg-[#E8FBFF] rounded-2xl border-2 border-transparent focus:border-[#0088A3] outline-none font-mono text-sm"
              />
              <button onClick={addKey} className="p-4 bg-[#0088A3] text-white rounded-2xl hover:bg-[#003B47] transition-all"><PlusCircle /></button>
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-[#0088A3] uppercase tracking-widest">Active Keys ({localKeys.length})</label>
             <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                {localKeys.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 font-bold italic text-sm border-2 border-dashed border-gray-100 rounded-2xl">No keys configured. Features will be disabled.</p>
                ) : (
                  localKeys.map((k, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <code className="text-[10px] font-mono text-gray-400 truncate max-w-[80%]">
                        {k.substring(0, 10)}************************{k.substring(k.length - 4)}
                      </code>
                      <button onClick={() => removeKey(idx)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
             </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-4 bg-[#0088A3] text-white rounded-2xl font-black shadow-xl shadow-[#0088A333] hover:bg-[#003B47] transition-all"
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuId>('Library');
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<CollectionEntry | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: keyof CollectionEntry | null, direction: 'asc'|'desc'|'default'}>({ key: null, direction: 'default' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const mainContentRef = useRef<HTMLDivElement>(null);

  const syncData = async () => {
    setIsLoading(true);
    try {
      const [collData, settings] = await Promise.all([
        fetchCollections(),
        fetchSettings()
      ]);
      if (collData) setCollections(collData);
      // Gunakan fallback array kosong jika settings.geminiKeys undefined
      setGeminiKeys(Array.isArray(settings?.geminiKeys) ? settings.geminiKeys : []);
    } catch (err) {
      console.error("Sync Data error:", err);
      setCollections(MOCK_COLLECTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { syncData(); }, []);

  const handleSaveSettings = async (newKeys: string[]) => {
    setIsLoading(true);
    try {
      await saveSettingsToGAS(newKeys);
      setGeminiKeys(newKeys);
      Swal.fire('Success', 'Configuration saved to vault.', 'success');
    } catch (err) {
      Swal.fire('Error', 'Failed to save settings.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...collections];
    if (activeMenu === 'Favourite') data = data.filter(item => item.isFavourite);
    if (activeMenu === 'Bookmark') data = data.filter(item => item.isBookmarked);
    if (selectedType !== 'All') data = data.filter(item => item.type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => item.title.toLowerCase().includes(q) || item.authorName?.toLowerCase().includes(q));
    }
    return data;
  }, [collections, activeMenu, searchQuery, selectedType]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  return (
    <div className="flex min-h-screen bg-[#E8FBFF]">
      {isLoading && (
        <div className="fixed inset-0 z-[3000] bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center">
          <RefreshCw className="w-12 h-12 text-[#0088A3] animate-spin mb-4" />
          <p className="text-[#003B47] font-black text-xs uppercase tracking-widest">Accessing Vault...</p>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        keys={geminiKeys} 
        onSave={handleSaveSettings} 
      />

      <Sidebar activeMenu={activeMenu} onMenuChange={(id) => {
        setActiveMenu(id);
        setIsAddingCollection(false);
        setViewingEntry(null);
      }} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="px-8 py-5 flex items-center justify-between bg-white/40 backdrop-blur-md border-b border-[#0088A311]">
          <div>
            <p className="text-[#0088A3] text-[10px] font-black uppercase tracking-widest">Academic Hub</p>
            <h1 className="text-xl font-black text-[#003B47]">Scholar's Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm ${geminiKeys && geminiKeys.length > 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}
            >
              <div className={`w-2 h-2 rounded-full ${geminiKeys && geminiKeys.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {geminiKeys && geminiKeys.length > 0 ? `${geminiKeys.length} KEYS ACTIVE` : 'NO KEYS CONFIGURED'}
              </span>
            </button>
            <button className="p-2.5 rounded-xl bg-white text-gray-400 hover:text-[#0088A3] transition-all shadow-sm">
              <Bell size={20} />
            </button>
            <img src="https://picsum.photos/seed/scholar/100" className="w-10 h-10 rounded-xl border-2 border-white shadow-md" alt="Profile" />
          </div>
        </header>

        <div ref={mainContentRef} className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {viewingEntry ? (
            <CollectionDetail 
              entry={viewingEntry} 
              onBack={() => setViewingEntry(null)} 
              onDelete={async (id) => {
                 const result = await Swal.fire({ title: 'Delete?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#0088A3' });
                 if (result.isConfirmed) {
                    await deleteCollectionsFromGAS([id]);
                    setCollections(prev => prev.filter(c => c.id !== id));
                    setViewingEntry(null);
                 }
              }} 
              onUpdate={async (id, updates) => {
                 await updateCollectionInGAS(id, updates);
                 setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
              }}
            />
          ) : isAddingCollection ? (
            <AddCollectionForm 
              onBack={() => setIsAddingCollection(false)} 
              onSave={async (entry) => {
                 setIsLoading(true);
                 try {
                    await saveCollectionToGAS(entry);
                    setCollections(prev => [entry as CollectionEntry, ...prev]);
                    setIsAddingCollection(false);
                    Swal.fire('Saved!', 'Collection added successfully.', 'success');
                 } catch (err) {
                    Swal.fire('Error', 'Failed to save to Cloud DB.', 'error');
                 } finally {
                    setIsLoading(false);
                 }
              }} 
            />
          ) : activeMenu === 'Research' ? (
            <ResearchPanel />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0088A3] transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search across entire library..."
                    className="pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-transparent focus:border-[#0088A3] transition-all outline-none w-full font-bold text-[#003B47]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsAddingCollection(true)}
                  className="px-8 py-4 bg-[#0088A3] text-white rounded-2xl font-black shadow-lg shadow-[#0088A333] hover:bg-[#003B47] transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Plus size={20} strokeWidth={3} />
                  ADD COLLECTION
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-white shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#0088A308] border-b border-[#0088A311]">
                    <tr>
                      <th className="px-6 py-5 text-[11px] font-black text-[#003B47] uppercase tracking-widest">Title</th>
                      <th className="px-6 py-5 text-[11px] font-black text-[#003B47] uppercase tracking-widest">Author</th>
                      <th className="px-6 py-5 text-[11px] font-black text-[#003B47] uppercase tracking-widest">Type</th>
                      <th className="px-6 py-5 text-[11px] font-black text-[#003B47] uppercase tracking-widest">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white">
                    {paginatedData.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold italic">No collections found in this view.</td></tr>
                    ) : (
                      paginatedData.map(item => (
                        <tr key={item.id} onClick={() => setViewingEntry(item)} className="hover:bg-white transition-all cursor-pointer group">
                          <td className="px-6 py-5"><span className="text-sm font-black text-[#003B47] group-hover:text-[#0088A3] transition-colors">{item.title}</span></td>
                          <td className="px-6 py-5 text-sm text-gray-500 font-medium">{item.authorName}</td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${item.type === 'Literature' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-[#003B47]">{item.year}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
