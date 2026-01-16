
import React from 'react';
import { LibraryBig, Heart, Bookmark, FlaskConical } from 'lucide-react';
import { MenuId, CollectionEntry } from './types';

export const COLORS = {
  background: '#E8FBFF',
  primary: '#0088A3',
  emphasis: '#003B47',
  accent: '#be2690',
};

export interface MenuItem {
  id: MenuId;
  label: string;
  icon: React.ReactNode;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 'Library', label: 'Library', icon: <LibraryBig size={20} /> },
  { id: 'Favourite', label: 'Favourite', icon: <Heart size={20} /> },
  { id: 'Bookmark', label: 'Bookmark', icon: <Bookmark size={20} /> },
  { id: 'Research', label: 'Research', icon: <FlaskConical size={20} /> },
];

export const TYPES = ["Literature", "Task", "Personal", "Other"];

export const MOCK_COLLECTIONS: CollectionEntry[] = [
  {
    id: '1',
    createdDateTime: '2024-03-10T10:00:00Z',
    type: 'Literature',
    category: 'Original Research',
    topic: 'Quantum Physics',
    subTopic: 'Quantum Entanglement',
    authorName: 'Dr. Alistair Cook',
    title: 'The Quantum World: Entanglement Dynamics',
    publisher: 'Nature Science',
    year: '2023',
    keyword: 'Quantum, Physics, Entanglement',
    tagLabel: 'Priority',
    sourceMethod: 'upload',
    sourceValue: 'quantum_paper.pdf',
    isFavourite: true
  },
  {
    id: '2',
    createdDateTime: '2024-03-12T14:30:00Z',
    type: 'Task',
    category: 'Project Document',
    topic: 'Architecture',
    subTopic: 'Modern Design',
    authorName: 'Sarah Jenkins',
    title: 'Urban Architecture Guidelines 2024',
    publisher: 'Design Press',
    year: '2024',
    keyword: 'Urban, Design, Guidelines',
    tagLabel: 'Work',
    sourceMethod: 'link',
    sourceValue: 'https://design.org/guidelines',
    isBookmarked: true
  },
  {
    id: '3',
    createdDateTime: '2024-03-15T09:15:00Z',
    type: 'Personal',
    category: 'Idea Draft',
    topic: 'Psychology',
    subTopic: 'Digital Behavior',
    authorName: 'Marcus Vane',
    title: 'Reflection on Digital Psychology',
    publisher: 'Personal Blog',
    year: '2023',
    keyword: 'Psychology, Digital, Reflection',
    tagLabel: 'Personal',
    sourceMethod: 'upload',
    sourceValue: 'reflection.docx',
    isFavourite: true,
    isBookmarked: true
  },
  {
    id: '4',
    createdDateTime: '2024-02-20T11:20:00Z',
    type: 'Literature',
    category: 'Review Article',
    topic: 'Space Exploration',
    subTopic: 'Mars Mission',
    authorName: 'Elena Rigby',
    title: 'A Review of Mars Habitability Studies',
    publisher: 'Astronomy Journal',
    year: '2022',
    keyword: 'Mars, Space, Habitability',
    tagLabel: 'Research',
    sourceMethod: 'link',
    sourceValue: 'https://astronomy.com/mars-review'
  }
];
