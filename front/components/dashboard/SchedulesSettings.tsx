'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Clock, AlertCircle, BarChart3, ArrowRight, Check, Calendar, Bot, RefreshCw } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Task, getUserTasks, deleteTask } from "@/lib/supabase";
import { format, parseISO, isAfter, addDays } from "date-fns";

// Toast component for notifications
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-3 rounded-md shadow-lg transition-all duration-300 
      ${type === 'success' ? 'bg-[#172D1B] border border-green-600' : 'bg-[#2D1B17] border border-red-600'}`}>
      <div className="mr-2">
        {type === 'success' ? 
          <Check className="w-4 h-4 text-green-400" /> : 
          <X className="w-4 h-4 text-red-400" />
        }
      </div>
      <p className="text-white text-xs sm:text-sm">{message}</p>
      <button onClick={onClose} className="ml-3 text-white/70 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// Extended task interface to include UI properties
interface UITask extends Task {
  timeRemaining: string;
  priority: 'low' | 'medium' | 'high';
}

export function SchedulesSettings() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load tasks from database
  useEffect(() => {
    if (user?.id) {
      loadUserTasks(user.id);
    }
  }, [user]);

  // Refresh tasks periodically without flickering
  useEffect(() => {
    if (!user?.id) return;
    
    const refreshInterval = setInterval(() => {
      // Utiliser un try/catch pour éviter que les erreurs n'arrêtent l'intervalle
      try {
        loadUserTasks(user.id, false, true).catch(err => {
          console.warn("Silent tasks refresh failed:", err);
        });
      } catch (error) {
        console.warn("Error in tasks refresh interval:", error);
      }
    }, 10000); // Refresh more frequently, every 10 seconds like in XRPStats
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  const loadUserTasks = async (userId: string, setLoadingState = true, silentMode = false): Promise<UITask[]> => {
    if (setLoadingState) setIsLoading(true);
    try {
      const userTasks = await getUserTasks(userId);
      
      // Transform tasks for UI display
      const formattedTasks = userTasks.map(task => transformTaskForUI(task));
      setTasks(formattedTasks);
      
      return formattedTasks;
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Only show toast for non-silent errors
      if (setLoadingState && !silentMode) {
        setToast({
          message: "Unable to load scheduled tasks",
          type: 'error'
        });
      }
      return [];
    } finally {
      if (setLoadingState) setIsLoading(false);
    }
  };

  // Function to manually refresh tasks
  const handleRefreshTasks = async () => {
    if (!user?.id) return;
    
    try {
      await loadUserTasks(user.id, true, false);
      // Always show success toast on manual refresh
      setToast({
        message: "Tasks refreshed successfully",
        type: 'success'
      });
    } catch (error) {
      console.error("Manual tasks refresh failed:", error);
      // Always show error toast on manual refresh failure
      setToast({
        message: "Failed to refresh tasks",
        type: 'error'
      });
    }
  };

  // Format database task for UI display
  const transformTaskForUI = (task: Task): UITask => {
    // Determine time remaining text
    let timeRemaining = 'Not scheduled';
    const now = new Date();
    
    // Handle different task types based on recurrence
    if (task.recurrence_type === 'once' || !task.recurrence_type) {
      // One-time task
      if (task.next_execution) {
        const nextExecDate = parseISO(task.next_execution);
        
        if (isAfter(nextExecDate, now)) {
          if (isAfter(nextExecDate, addDays(now, 1))) {
            timeRemaining = `Scheduled: ${format(nextExecDate, 'MMM d, yyyy HH:mm')}`;
          } else {
            timeRemaining = `Today at ${format(nextExecDate, 'HH:mm')}`;
          }
        } else if (task.status === 'pending' || task.status === 'active') {
          timeRemaining = 'Execution pending';
        }
      }
      
      // For completed one-time tasks, show execution time
      if (task.last_execution && (task.status === 'completed' || task.status === 'failed')) {
        const lastExecDate = parseISO(task.last_execution);
        timeRemaining = `Executed: ${format(lastExecDate, 'MMM d, yyyy HH:mm')}`;
      }
    } else {
      // Recurring task
      let recurrenceText = '';
      const interval = task.recurrence_interval || 1;
      
      // Build recurrence text
      if (task.recurrence_type === 'daily') {
        recurrenceText = interval === 1 ? 'Daily' : `Every ${interval} days`;
      } else if (task.recurrence_type === 'weekly') {
        recurrenceText = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      } else if (task.recurrence_type === 'monthly') {
        recurrenceText = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      } else if (task.recurrence_type === 'minutely') {
        recurrenceText = interval === 1 ? 'Every minute' : `Every ${interval} minutes`;
      }
      
      // Add next execution time for recurring tasks
      if (task.next_execution) {
        const nextExecDate = parseISO(task.next_execution);
        
        if (isAfter(nextExecDate, now)) {
          if (isAfter(nextExecDate, addDays(now, 1))) {
            timeRemaining = `${recurrenceText} • Next: ${format(nextExecDate, 'MMM d, HH:mm')}`;
          } else {
            timeRemaining = `${recurrenceText} • Next: Today at ${format(nextExecDate, 'HH:mm')}`;
          }
        } else if (task.status === 'pending' || task.status === 'active') {
          timeRemaining = `${recurrenceText} • Execution pending`;
        }
      } else {
        timeRemaining = recurrenceText;
      }
      
      // Add last execution info if available for recurring tasks
      if (task.last_execution) {
        const lastExecDate = parseISO(task.last_execution);
        timeRemaining += ` • Last run: ${format(lastExecDate, 'MMM d, HH:mm')}`;
      }
    }
    
    // Determine priority based on task config or status
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (task.task_config && task.task_config.priority) {
      priority = task.task_config.priority;
    } else if (task.status === 'pending') {
      priority = 'low';
    } else if (task.status === 'active') {
      priority = 'medium';
    } else if (task.status === 'failed') {
      priority = 'high';
    }
    
    return {
      ...task,
      timeRemaining,
      priority
    };
  };

  // Function to remove a task
  const removeTask = async (taskId: string) => {
    try {
      console.log('Deleting task:', taskId);
      const success = await deleteTask(taskId);
      
      if (success) {
        setTasks(tasks.filter(task => task.id !== taskId));
        setToast({
          message: "Task deleted successfully",
          type: 'success'
        });
      } else {
        setToast({
          message: "Failed to delete task",
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setToast({
        message: "Error deleting task",
        type: 'error'
      });
    }
  };

  // Icon mapping for task types
  const getTaskIcon = (action: string) => {
    switch (action) {
      case 'balance_check':
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />;
      case 'generate_report':
        return <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />;
      case 'price_alert':
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />;
      case 'auto_trade':
        return <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />;
      default:
        return <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />;
    }
  };

  // Get background color based on priority
  const getPriorityStyle = (priority: UITask['priority']) => {
    switch (priority) {
      case 'low':
        return 'border-l-blue-500';
      case 'medium':
        return 'border-l-amber-500';
      case 'high':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Get status indicator
  const getStatusIndicator = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>;
      case 'active':
        return <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>;
      case 'completed':
        return <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>;
      case 'failed':
        return <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>;
      case 'cancelled':
        return <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>;
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base sm:text-lg font-medium">Scheduled Tasks</CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                AI-managed scheduled tasks for your wallet
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
                <Bot className="h-3 w-3 mr-1" /> AI Managed
              </div>
              <button 
                disabled
                className="p-1 rounded-full opacity-50 cursor-not-allowed"
                title="Loading tasks..."
              >
                <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-[200px]">
            <RefreshCw className="h-8 w-8 text-blue-500/50 animate-spin mb-4" />
            <div className="text-gray-400 text-sm">Loading scheduled tasks...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <CardHeader className="">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-base sm:text-lg font-medium">Scheduled Tasks</CardTitle>
            <CardDescription className="text-gray-400 text-xs sm:text-sm">
              AI-managed scheduled tasks for your wallet
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
              <Bot className="h-3 w-3 mr-1" /> AI Managed
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 sm:p-4 h-[calc(100%-70px)] flex flex-col overflow-hidden">
        {tasks.length > 0 ? (
          <div className="flex-1 overflow-y-auto pb-2">
            <div className="space-y-3 sm:space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`bg-[#151d2e] rounded-md overflow-hidden border-l-2 ${getPriorityStyle(task.priority)} hover:bg-[#182032] transition-colors duration-200`}
                >
                  <div className="p-2 sm:p-3">
                    <div className="flex flex-col gap-2">
                      {/* Header row with name, status and delete button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {getTaskIcon(task.action)}
                          </div>
                          <h3 className="text-white text-xs sm:text-sm font-medium">{task.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px]
                            ${task.status === 'completed' ? 'bg-blue-900/30 text-blue-300' : 
                              task.status === 'pending' ? 'bg-gray-800/50 text-gray-300' : 
                              task.status === 'active' ? 'bg-green-900/30 text-green-300' : 
                              task.status === 'failed' ? 'bg-red-900/30 text-red-300' : 
                              'bg-gray-800/50 text-gray-300'}
                          `}>
                            {getStatusIndicator(task.status)}
                            <span className="capitalize">{task.status}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full hover:bg-red-900/20 hover:text-red-400 flex-shrink-0"
                            onClick={() => removeTask(task.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Task content - condensed info */}
                      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1.5">
                          {task.recurrence_type && task.recurrence_type !== 'once' ? (
                            <span className="bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                              Recurring
                            </span>
                          ) : (
                            <span className="bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded">
                              One-time
                            </span>
                          )}
                          
                          {/* Only show description if it exists and isn't too long */}
                          {task.description && task.description.length < 60 && (
                            <span className="text-gray-400 truncate max-w-[150px]">{task.description}</span>
                          )}
                        </div>
                        
                        {/* Time remaining */}
                        <p className="text-gray-500 flex items-center truncate">
                          <Clock className="inline w-2.5 h-2.5 mr-1 text-gray-500" />
                          <span className="truncate max-w-[180px]">{task.timeRemaining}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#1a2234] flex items-center justify-center mb-2">
                <Bot className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-gray-300 text-xs sm:text-sm mb-1">No scheduled tasks</p>
              <p className="text-gray-500 text-[10px] sm:text-xs max-w-[250px]">
                Scheduled tasks will appear here once the AI creates them based on your wallet activity
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 