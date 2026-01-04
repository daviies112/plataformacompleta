import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Meeting } from "@/lib/mock-store";
import { useState } from "react";
import { Link } from "react-router-dom";

interface CalendarProps {
  meetings: Meeting[];
  onDateClick: (date: Date) => void;
}

export function Calendar({ meetings, onDateClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter(m => isSameDay(new Date(m.data_inicio), day));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
           <Button variant="outline" onClick={goToToday}>Hoje</Button>
           <div className="flex items-center border rounded-md">
             <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
             <div className="w-40 text-center font-medium">
               {format(currentDate, "MMMM yyyy", { locale: ptBR })}
             </div>
             <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
           </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border rounded-md overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 border-b bg-muted/20">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5">
            {days.map((day, dayIdx) => {
               const dayMeetings = getMeetingsForDay(day);
               return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[100px] border-b border-r p-2 transition-colors hover:bg-muted/10 cursor-pointer relative group bg-background",
                    !isSameMonth(day, monthStart) && "bg-muted/5 text-muted-foreground",
                    isToday(day) && "bg-blue-50/50 dark:bg-blue-900/10",
                    dayIdx % 7 === 0 && "border-l"
                  )}
                  onClick={() => onDateClick(day)}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 h-7 w-7 flex items-center justify-center rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayMeetings.map((meeting) => (
                      <Link key={meeting.id} to={`/reuniao/${meeting.id}`}>
                        <div 
                          className="text-xs p-1.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 truncate hover:opacity-80 transition-opacity border-l-2 border-blue-500 shadow-sm"
                          title={meeting.titulo}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="font-semibold truncate">{format(new Date(meeting.data_inicio), 'HH:mm')} {meeting.titulo}</div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Add button on hover */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-sm">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
