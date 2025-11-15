'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SemanticSearch } from '@/components/SemanticSearch';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Semantic Employee Search
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered search that understands context and meaning
          </p>
        </DialogHeader>
        <div className="px-6 pb-6">
          <SemanticSearch />
        </div>
      </DialogContent>
    </Dialog>
  );
}
