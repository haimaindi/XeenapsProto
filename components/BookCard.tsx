
import React from 'react';
import { Star, Heart, Bookmark } from 'lucide-react';
import { Book } from '../types';
import { COLORS } from '../constants';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-[#0088A333]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl mb-4">
        <img 
          src={book.cover} 
          alt={book.title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className={`p-2 rounded-full bg-white/90 shadow-md transition-colors ${book.isFavourite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
            <Heart size={16} fill={book.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <button className={`p-2 rounded-full bg-white/90 shadow-md transition-colors ${book.isBookmarked ? 'text-[#0088A3]' : 'text-gray-400 hover:text-[#0088A3]'}`}>
            <Bookmark size={16} fill={book.isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#003B47]/80 backdrop-blur-sm text-white text-[10px] rounded-lg">
          {book.category}
        </div>
      </div>
      
      <h3 className="font-bold text-[#003B47] line-clamp-1 group-hover:text-[#0088A3] transition-colors">{book.title}</h3>
      <p className="text-sm text-gray-500 mb-2">{book.author}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-[#003B47]">{book.rating}</span>
        </div>
        <button 
          className="text-xs font-semibold px-3 py-1 rounded-full border border-[#0088A3] text-[#0088A3] hover:bg-[#0088A3] hover:text-white transition-all"
        >
          Details
        </button>
      </div>
    </div>
  );
};

export default BookCard;
