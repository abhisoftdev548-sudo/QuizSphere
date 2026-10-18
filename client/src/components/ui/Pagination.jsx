import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showPages = 5;
  let start = Math.max(1, currentPage - Math.floor(showPages / 2));
  let end = Math.min(totalPages, start + showPages - 1);
  if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <p className="text-[13px] text-textSecondary">Page {currentPage} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {start > 1 && (
          <>
            <Button variant={currentPage === 1 ? 'primary' : 'secondary'} size="sm" onClick={() => onPageChange(1)}>1</Button>
            {start > 2 && <span className="px-2 text-textSecondary">...</span>}
          </>
        )}
        {pages.map(p => (
          <Button key={p} variant={currentPage === p ? 'primary' : 'secondary'} size="sm" onClick={() => onPageChange(p)}>{p}</Button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-2 text-textSecondary">...</span>}
            <Button variant={currentPage === totalPages ? 'primary' : 'secondary'} size="sm" onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
          </>
        )}
        <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
