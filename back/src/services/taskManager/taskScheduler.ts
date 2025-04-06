import cron from 'node-cron';
import { supabase } from '../../config/supabase';
import { Task, TaskStatus } from '../../models/types';
import { taskExecutor } from './taskExecutor';

class TaskScheduler {
  private isInitialized = false;
  private cronJob: cron.ScheduledTask | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 30000; // 30 secondes

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Lancer le CRON JOB pour vérifier les tâches toutes les minutes
      this.cronJob = cron.schedule('* * * * *', () => this.checkPendingTasks());
      
      // Configurer l'intervalle de rafraîchissement pour les tâches
      this.startRefreshInterval();
      
      this.isInitialized = true;
      console.log('Task scheduler initialized successfully');
      
      // Exécuter immédiatement pour traiter les tâches manquées
      await this.checkPendingTasks();
    } catch (error) {
      console.error('Failed to initialize task scheduler:', error);
      throw error;
    }
  }

  /**
   * Démarre l'intervalle de rafraîchissement des tâches
   */
  private startRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
      console.log(`Rafraîchissement périodique des tâches (toutes les ${this.REFRESH_INTERVAL_MS / 1000}s)`);
      await this.checkPendingTasks();
    }, this.REFRESH_INTERVAL_MS);
    
    console.log(`Intervalle de rafraîchissement des tâches configuré (${this.REFRESH_INTERVAL_MS / 1000}s)`);
  }

  async checkPendingTasks() {
    try {
      console.log('Vérification des tâches en attente...');
      const now = new Date().toISOString();
      
      // Récupérer les tâches en attente dont l'exécution est prévue ou dépassée
      const { data: pendingTasks, error } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['pending', 'active'])
        .or(`next_execution.lte.${now},next_execution.is.null`);
      
      if (error) {
        console.error('Error fetching pending tasks:', error);
        return;
      }
      
      // Si aucune tâche n'est trouvée, afficher une info simplifiée
      if (!pendingTasks || pendingTasks.length === 0) {
        // Vérifier s'il y a des tâches dont la date est dépassée mais qui n'ont pas été exécutées
        const { data: missedTasks, error: missedError } = await supabase
          .from('tasks')
          .select('*')
          .in('status', ['pending', 'active'])
          .lt('next_execution', now);
          
        if (missedError) {
          console.error('Erreur lors de la recherche des tâches manquées:', missedError);
        } else if (missedTasks && missedTasks.length > 0) {
          console.log(`Tâches manquées trouvées: ${missedTasks.length}`);
          console.log(`Exécution immédiate des tâches manquées...`);
          
          for (const task of missedTasks) {
            console.log(`Exécution de la tâche manquée: ${task.name} (ID: ${task.id})`);
            await this.executeTask(task);
          }
        } else {
          console.log('Aucune tâche à exécuter pour le moment.');
          
          // Obtenir un résumé des tâches actives
          const { data: activeTasks } = await supabase
            .from('tasks')
            .select('id, name, status, action, next_execution')
            .in('status', ['pending', 'active'])
            .order('next_execution', { ascending: true })
            .limit(5);
            
          if (activeTasks && activeTasks.length > 0) {
            console.log(`Prochaines tâches (${activeTasks.length}):`);
            activeTasks.forEach(t => {
              console.log(`- ${t.name}: ${t.next_execution || 'non planifiée'}`);
            });
          }
        }
      } else {
        console.log(`Tâches à exécuter: ${pendingTasks.length}`);
        
        // Trier les tâches par priorité: d'abord celles dont la date est dépassée
        const sortedTasks = pendingTasks.sort((a, b) => {
          // Si a.next_execution est null, le placer après b
          if (!a.next_execution) return 1;
          // Si b.next_execution est null, le placer après a
          if (!b.next_execution) return -1;
          // Sinon, trier par date (les plus anciennes d'abord)
          return new Date(a.next_execution).getTime() - new Date(b.next_execution).getTime();
        });
        
        // Exécuter chaque tâche par ordre de priorité
        for (const task of sortedTasks) {
          console.log(`Exécution de la tâche: ${task.name} (planifiée pour: ${task.next_execution || 'dès que possible'})`);
          await this.executeTask(task);
        }
      }
    } catch (error) {
      console.error('Error in checkPendingTasks:', error);
    }
  }

  private async executeTask(task: Task) {
    try {
      console.log(`Début d'exécution de la tâche ${task.id}`);
      
      // Mettre à jour le statut de la tâche en cours d'exécution
      await this.updateTaskStatus(task.id, 'active');
      
      // Créer une entrée dans TaskExecutions pour cette exécution
      const { data: execution, error: executionError } = await supabase
        .from('taskexecutions')
        .insert({
          task_id: task.id,
          execution_start: new Date().toISOString(),
          status: 'success',
          execution_data: {}
        })
        .select()
        .single();
      
      if (executionError) {
        console.error(`Erreur lors de la création de l'exécution:`, executionError);
        throw executionError;
      }
      
      console.log(`Exécution de la tâche avec taskExecutor...`);
      // Exécuter la tâche avec le taskExecutor
      const result = await taskExecutor.executeTask(task);
      console.log(`Résultat de l'exécution:`, result);
      
      // Mettre à jour l'entrée TaskExecution avec le résultat
      await supabase
        .from('taskexecutions')
        .update({
          execution_end: new Date().toISOString(),
          status: result.success ? 'success' : 'failed',
          error_message: result.error || null,
          execution_data: result.data || {}
        })
        .eq('id', execution?.id);
      
      // Calculer la prochaine exécution ou marquer comme terminée
      await this.updateNextExecution(task);
      
    } catch (error) {
      console.error(`Error executing task ${task.id}:`, error);
      
      // Marquer la tâche comme échouée en cas d'erreur système
      await supabase
        .from('tasks')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
    }
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status,
          last_execution: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Error updating task ${taskId} status:`, error);
    }
  }

  private async updateNextExecution(task: Task) {
    try {
      let nextExecution: string | null = null;
      let status: TaskStatus = 'completed';
      
      // Calculer la prochaine exécution en fonction du type de récurrence
      if (task.recurrence_type) {
        // Utiliser la date actuelle comme base pour le calcul
        const now = new Date();
        let nextDate = new Date(now);
        
        switch (task.recurrence_type) {
          case 'once':
            // Pour les tâches uniques, pas de prochaine exécution
            nextExecution = null;
            break;
            
          case 'minutely':
            // Ajouter le nombre de minutes spécifié par l'intervalle
            nextDate.setMinutes(nextDate.getMinutes() + task.recurrence_interval);
            nextExecution = nextDate.toISOString();
            status = 'pending';
            break;
            
          case 'daily':
            // Ajouter le nombre de jours spécifié par l'intervalle
            nextDate.setDate(nextDate.getDate() + task.recurrence_interval);
            nextExecution = nextDate.toISOString();
            status = 'pending';
            break;
            
          case 'weekly':
            // Trouver le prochain jour de la semaine correspondant
            if (task.recurrence_days && task.recurrence_days.length > 0) {
              const daysToAdd = 7 * task.recurrence_interval;
              nextDate.setDate(nextDate.getDate() + daysToAdd);
              nextExecution = nextDate.toISOString();
              status = 'pending';
            }
            break;
            
          case 'monthly':
            // Ajouter le nombre de mois spécifié par l'intervalle
            nextDate.setMonth(nextDate.getMonth() + task.recurrence_interval);
            nextExecution = nextDate.toISOString();
            status = 'pending';
            break;
        }
        
        // Vérifier si la prochaine exécution est dans le futur
        if (nextExecution) {
          const nextDate = new Date(nextExecution);
          const now = new Date();
          
          // Si la date calculée est dans le passé, ajuster pour qu'elle soit dans le futur
          if (nextDate <= now) {
            console.log(`La prochaine exécution calculée est dans le passé. Ajustement...`);
            
            // Recalculer en fonction du type de récurrence
            switch (task.recurrence_type) {
              case 'minutely':
                while (nextDate <= now) {
                  nextDate.setMinutes(nextDate.getMinutes() + task.recurrence_interval);
                }
                break;
                
              case 'daily':
                while (nextDate <= now) {
                  nextDate.setDate(nextDate.getDate() + task.recurrence_interval);
                }
                break;
                
              case 'weekly':
                while (nextDate <= now) {
                  nextDate.setDate(nextDate.getDate() + (7 * task.recurrence_interval));
                }
                break;
                
              case 'monthly':
                while (nextDate <= now) {
                  nextDate.setMonth(nextDate.getMonth() + task.recurrence_interval);
                }
                break;
            }
            
            nextExecution = nextDate.toISOString();
            console.log(`Nouvelle date d'exécution ajustée: ${nextExecution}`);
          }
        }
      }
      
      // Mettre à jour la tâche avec la prochaine exécution
      const { error } = await supabase
        .from('tasks')
        .update({
          next_execution: nextExecution,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      
      if (error) throw error;
      
      console.log(`Tâche ${task.id} mise à jour: status=${status}, prochaine exécution=${nextExecution || 'aucune'}`);
    } catch (error) {
      console.error(`Error updating next execution for task ${task.id}:`, error);
    }
  }

  stopService() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.isInitialized = false;
    console.log('Task scheduler service stopped');
  }
}

export const taskScheduler = new TaskScheduler(); 