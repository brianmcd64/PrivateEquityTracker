import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task, TaskStatuses } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, isToday, isSameMonth, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, AlertOctagon, CheckCircle, Clock } from "lucide-react";

export default function CalendarPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get the active deal from localStorage
  const [dealId, setDealId] = useState<number | null>(null);
  const [dealName, setDealName] = useState<string>("");
  
  // Load active deal from localStorage
  useEffect(() => {
    const storedDealId = localStorage.getItem("activeDealId");
    if (storedDealId) {
      setDealId(parseInt(storedDealId));
    } else {
      // Redirect to deal management if no active deal
      navigate("/deals");
    }
  }, [navigate]);
  
  // Fetch deal info
  const { data: deal } = useQuery<Deal>({
    queryKey: dealId ? [`/api/deals/${dealId}`] : ['skip-query'],
    enabled: !!dealId,
  });
  
  // Update deal name when deal data is loaded
  useEffect(() => {
    if (deal) {
      setDealName(deal.name);
    }
  }, [deal]);
  
  // Fetch all tasks for the deal
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: dealId ? [`/api/deals/${dealId}/tasks`] : ['skip-tasks-query'],
    enabled: !!dealId,
  });
  
  // Generate calendar dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of the week the month starts on (0 = Sunday, 1 = Monday, etc.)
  const startDay = getDay(monthStart);
  
  // Generate empty cells for days before the month starts
  const emptyCellsBefore = Array.from({ length: startDay }, (_, i) => i);
  
  // Get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    if (!tasks) return [];
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return isSameDay(dueDate, day);
    });
  };
  
  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  // Task click handler
  const handleTaskClick = (taskId: number) => {
    navigate(`/task/${taskId}`);
  };
  
  // Get status indicator for a task
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case TaskStatuses.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500 mr-1" />;
      case TaskStatuses.IN_PROGRESS:
        return <Clock className="h-4 w-4 text-blue-500 mr-1" />;
      case TaskStatuses.NOT_STARTED:
      case TaskStatuses.PENDING:
      default:
        return <AlertOctagon className="h-4 w-4 text-orange-500 mr-1" />;
    }
  };

  return (
    <Layout 
      title="Calendar View" 
      subtitle="TechFusion Acquisition"
    >
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="mx-4 text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day Names */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Cells */}
          <div className="grid grid-cols-7 grid-rows-[auto_repeat(5,1fr)] min-h-[600px]">
            {/* Empty cells before the month starts */}
            {emptyCellsBefore.map(i => (
              <div key={`empty-before-${i}`} className="border-r border-b min-h-24 bg-gray-50"></div>
            ))}
            
            {/* Days of the month */}
            {calendarDays.map(day => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div 
                  key={format(day, "yyyy-MM-dd")} 
                  className={`border-r border-b min-h-24 relative ${
                    !isCurrentMonth ? "bg-gray-50" : ""
                  } ${
                    isCurrentDay ? "bg-blue-50" : ""
                  }`}
                >
                  {/* Day number */}
                  <div className={`text-right p-1 ${
                    isCurrentDay 
                      ? "bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center ml-auto mr-1 mt-1" 
                      : "text-gray-700"
                  }`}>
                    {format(day, "d")}
                  </div>
                  
                  {/* Tasks for this day */}
                  <div className="px-1 pb-1 space-y-1 max-h-[calc(100%-24px)] overflow-y-auto">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className={`px-2 py-1 rounded text-xs font-medium truncate cursor-pointer ${
                          task.status === TaskStatuses.COMPLETED 
                            ? "bg-green-50 text-green-700" 
                            : task.status === TaskStatuses.IN_PROGRESS 
                              ? "bg-blue-50 text-blue-700"
                              : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        <div className="flex items-center">
                          {getStatusIndicator(task.status)}
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {isLoading && (
        <div className="mt-4 text-center text-gray-500">
          Loading tasks...
        </div>
      )}
      
      {error && (
        <div className="mt-4 text-center text-red-500">
          Error loading tasks
        </div>
      )}
    </Layout>
  );
}
