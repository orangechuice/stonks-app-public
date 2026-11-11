import React, { useState } from 'react';
import { CustomDateRange } from '../types/stock';
import { Calendar, X, Check } from 'lucide-react';

interface DateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRange: CustomDateRange;
  onApplyRange: (range: CustomDateRange) => void;
}

export const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({
  isOpen,
  onClose,
  currentRange,
  onApplyRange,
}) => {
  const [startDate, setStartDate] = useState(currentRange.startDate);
  const [endDate, setEndDate] = useState(currentRange.endDate);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!startDate || !endDate) {
      setErrorMsg('Please select both Start and End dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start date must be prior to or equal to End date.');
      return;
    }

    setErrorMsg(null);
    onApplyRange({ startDate, endDate });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease-out',
        padding: '16px',
      }}
      onClick={onClose}
    >
      {/* Material 3 Modal Dialog Container */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--md-sys-shape-extra-large)',
          boxShadow: 'var(--md-sys-elevation-3)',
          padding: 24,
          color: 'var(--md-sys-color-on-surface)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--md-sys-shape-full)',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2
                className="md-typescale-title-large"
                style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontWeight: 700 }}
              >
                Date Range
              </h2>
              <p
                className="md-typescale-body-small"
                style={{ color: 'var(--md-sys-color-on-surface-variant)', margin: '2px 0 0 0' }}
              >
                Filter custom market timeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md-icon-button"
            style={{ width: 36, height: 36 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Inputs (M3 Outlined Style) */}
        <form onSubmit={handleApply}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                className="md-typescale-label-medium"
                style={{
                  color: 'var(--md-sys-color-on-surface-variant)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 14px',
                  borderRadius: 'var(--md-sys-shape-medium)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                  fontSize: 14,
                  fontFamily: 'var(--md-sys-typescale-font-plain)',
                  outline: 'none',
                  colorScheme: 'dark',
                  transition: 'border-color var(--md-sys-motion-duration-short) ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
                }}
              />
            </div>

            <div>
              <label
                className="md-typescale-label-medium"
                style={{
                  color: 'var(--md-sys-color-on-surface-variant)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 14px',
                  borderRadius: 'var(--md-sys-shape-medium)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                  fontSize: 14,
                  fontFamily: 'var(--md-sys-typescale-font-plain)',
                  outline: 'none',
                  colorScheme: 'dark',
                  transition: 'border-color var(--md-sys-motion-duration-short) ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--md-sys-color-negative)',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Action Buttons (M3 Text Button & Filled Button) */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--md-sys-shape-full)',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--md-sys-color-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color var(--md-sys-motion-duration-short) ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-state-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--md-sys-shape-full)',
                backgroundColor: 'var(--md-sys-color-primary)',
                border: 'none',
                color: 'var(--md-sys-color-on-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: 'var(--md-sys-elevation-1)',
                transition: 'all var(--md-sys-motion-duration-short) ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-2)';
                e.currentTarget.style.filter = 'brightness(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-1)';
                e.currentTarget.style.filter = 'none';
              }}
            >
              <Check size={16} /> Apply Custom Range
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
