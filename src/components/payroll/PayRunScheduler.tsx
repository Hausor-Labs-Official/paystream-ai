'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PayRunSchedulerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function PayRunScheduler({ value, onChange, className }: PayRunSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setTempDate(date);
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setOpen(false);
  };

  const daysUntil = Math.ceil((value.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={cn('flex flex-col', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent',
              !value && 'text-muted-foreground'
            )}
          >
            <div className="w-full">
              <p className="text-2xl font-semibold text-black">
                {format(value, 'MMM d, yyyy')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-[#737E9C]">
                  {daysUntil > 0
                    ? `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`
                    : daysUntil === 0
                    ? 'Today'
                    : 'Past due'}
                </p>
                <span className="text-xs text-[#737E9C]">•</span>
                <p className="text-xs text-[#0044FF] hover:underline">
                  Click to change
                </p>
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-medium">Schedule Next Pay Run</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select a date for the next payroll run
            </p>
          </div>
          <div className="p-3 bg-white">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={handleSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              initialFocus
              className="rounded-md bg-white"
            />
          </div>
          <div className="border-t px-3 py-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              className="bg-[#0044FF] hover:bg-[#0033CC] text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
