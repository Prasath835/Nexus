import React, { useState } from 'react';
import { Star, AlertCircle, CheckCircle2, Info, X, Package } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function formatINR(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

export const ResilientImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F2F1ED] text-zinc-500 p-6 text-center select-none ${className}`}
      >
        <Package className="w-8 h-8 stroke-[1.25] mb-2 text-zinc-400" />
        <span className="text-xs font-medium line-clamp-2 max-w-[18ch]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const RatingStars: React.FC<{
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}> = ({ rating, count, size = 'sm' }) => {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600 tabular-nums">
      <div className="flex items-center gap-0.5 text-zinc-900">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconClass} ${
              star <= Math.round(rating)
                ? 'fill-zinc-900 text-zinc-900'
                : 'fill-transparent text-zinc-300'
            }`}
          />
        ))}
      </div>
      <span className="font-medium text-zinc-900">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <>
          <span aria-hidden="true">·</span>
          <span>{count} reviews</span>
        </>
      )}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-4 py-6" role="status" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-24 w-full bg-zinc-200/60 animate-pulse rounded-lg"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="py-16 px-6 text-center border border-zinc-200/80 rounded-lg bg-white">
    <h3 className="font-display text-2xl font-semibold text-zinc-900 mb-2">{title}</h3>
    <p className="text-sm text-zinc-600 max-w-md mx-auto mb-6">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 text-xs font-semibold text-white bg-zinc-900 rounded-md hover:bg-zinc-800 transition-colors whitespace-nowrap"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div className="p-6 border border-red-200 bg-red-50/50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-semibold text-red-900">Unable to complete request</h4>
        <p className="text-xs text-red-700 mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-medium bg-white border border-red-200 text-red-800 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
      >
        Retry
      </button>
    )}
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
      <div className={`bg-[#FBFBF9] border border-zinc-200 rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h3 className="font-display text-xl font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
    <p className="text-sm text-zinc-600 mb-6">{description}</p>
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-xs font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors whitespace-nowrap"
      >
        Cancel
      </button>
      <button
        onClick={() => {
          onConfirm();
          onClose();
        }}
        className={`px-4 py-2 text-xs font-semibold text-white rounded-md transition-colors whitespace-nowrap ${
          danger ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-900 hover:bg-zinc-800'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-8 tabular-nums">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="px-3.5 py-2 text-xs font-medium border border-zinc-200 rounded-md disabled:opacity-40 hover:bg-zinc-100 transition-colors whitespace-nowrap"
      >
        Previous
      </button>
      <span className="text-xs text-zinc-600 px-3">
        Page <strong className="text-zinc-900">{page}</strong> of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-3.5 py-2 text-xs font-medium border border-zinc-200 rounded-md disabled:opacity-40 hover:bg-zinc-100 transition-colors whitespace-nowrap"
      >
        Next
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border bg-zinc-900 text-white border-zinc-800 text-xs"
        >
          <div className="flex items-center gap-2.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-zinc-300 shrink-0" />}
            <span className="font-medium leading-snug">{t.message}</span>
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
