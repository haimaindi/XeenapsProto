
export type MenuId = 'Library' | 'Favourite' | 'Bookmark' | 'Research';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  cover: string;
  rating: number;
  isFavourite: boolean;
  isBookmarked: boolean;
}

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export interface CitationSet {
  apa: string;
  harvard: string;
  vancouver: string;
}

export interface Terminology {
  term: string;
  explanation: {
    en: string;
    id: string;
  };
}

export interface SupportingRef {
  citation: string;
  relevance: {
    en: string;
    id: string;
  };
  link: string;
}

export interface CollectionEntry {
  id: string;
  createdDateTime: string;
  updatedDateTime?: string;
  category: string;
  type: string;
  topic: string;
  subTopic?: string;
  authorName?: string;
  title: string;
  publisher?: string;
  year?: string;
  keyword?: string;
  tagLabel?: string;
  inTextCitation?: string; // Stored as JSON string of CitationSet
  inReferenceCitation?: string; // Stored as JSON string of CitationSet
  researchMethodology?: string;
  abstract?: string;
  summary?: string;
  strength?: string;
  weakness?: string;
  unfamiliarTerminology?: string; // Stored as JSON string of Terminology[]
  supportingReferences?: string; // Stored as JSON string of SupportingRef[] -- Changed to string to match usage
  tipsForYou?: string;
  sourceMethod: 'upload' | 'link';
  sourceValue: string;
  isFavourite?: boolean;
  isBookmarked?: boolean;
  fileData?: string; // Base64 if uploaded
  extractedText?: string; // Text extracted from Word/Excel/PPT
}
