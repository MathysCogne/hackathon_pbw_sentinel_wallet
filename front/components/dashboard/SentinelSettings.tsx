'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Bell, Mail, MessageSquare, Phone, Check, X, Bot } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { SentinelWallet, getSentinelSettings, updateSentinelSettings } from "@/lib/supabase";

// Composant Toast personnalisé
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
    <div className={`fixed top-4 right-4 z-50 flex items-center p-3 rounded-md shadow-lg transition-opacity duration-300 ${
      type === 'success' ? 'bg-green-800' : 'bg-red-800'
    }`}>
      <div className="mr-2">
        {type === 'success' ? <Check className="w-4 h-4 text-green-300" /> : <X className="w-4 h-4 text-red-300" />}
      </div>
      <p className="text-white text-sm">{message}</p>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

interface Provider {
  id: string;
  name: string;
  icon: React.ReactNode;
  configField: string;
  placeholder: string;
  isActive: boolean;
  configValue: string;
}

export function SentinelSettings() {
  const { user } = useUser();
  const [sentinelActive, setSentinelActive] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [providers, setProviders] = useState<Provider[]>([
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-400" />,
      configField: 'Email address',
      placeholder: 'your@email.com',
      isActive: false,
      configValue: ''
    },
    {
      id: 'twilio',
      name: 'SMS (Twilio)',
      icon: <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-400" />,
      configField: 'Phone number',
      placeholder: '+1 234 567 8901',
      isActive: false,
      configValue: ''
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-400" />,
      configField: 'Webhook URL',
      placeholder: 'https://discord.com/api/webhooks/...',
      isActive: false,
      configValue: ''
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-400" />,
      configField: 'Bot Token & Chat ID',
      placeholder: 'token:chatid',
      isActive: false,
      configValue: ''
    }
  ]);
  const [sentinelSettings, setSentinelSettings] = useState<SentinelWallet | null>(null);
  const [changesMade, setChangesMade] = useState(false);

  useEffect(() => {
    console.log('Current user in SentinelSettings:', user);
  }, [user]);

  // Function to load data from the database
  const loadSentinelSettings = async (userId: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching sentinel settings for user ID:', userId);
      const settings = await getSentinelSettings(userId);
      console.log('Retrieved sentinel settings:', settings);
      
      if (settings) {
        setSentinelSettings(settings);
        setSentinelActive(settings.enabled);
        
        // Update providers based on settings
        const updatedProviders = [...providers];
        updatedProviders.forEach(provider => {
          // Check if this provider is enabled
          provider.isActive = settings.provider.includes(provider.id);
          
          // Set configuration values
          if (provider.id === 'email' && settings.provider_config && 
              typeof settings.provider_config === 'object' && 
              'email' in settings.provider_config && 
              settings.provider_config.email && 
              typeof settings.provider_config.email === 'object' &&
              'address' in settings.provider_config.email) {
            provider.configValue = settings.provider_config.email.address as string;
          } else if (provider.id === 'twilio' && 
              settings.provider_config && 
              typeof settings.provider_config === 'object' && 
              'twilio' in settings.provider_config) {
            provider.configValue = settings.provider_config.twilio?.phone_number || '';
          } else if (provider.id === 'discord' && 
              settings.provider_config && 
              typeof settings.provider_config === 'object' && 
              'discord' in settings.provider_config) {
            provider.configValue = settings.provider_config.discord?.webhook_url || '';
          } else if (provider.id === 'telegram' && 
              settings.provider_config && 
              typeof settings.provider_config === 'object' && 
              'telegram' in settings.provider_config) {
            const botToken = settings.provider_config.telegram?.bot_token || '';
            const chatId = settings.provider_config.telegram?.chat_id || '';
            if (botToken && chatId) {
              provider.configValue = `${botToken}:${chatId}`;
            }
          }
        });
        
        setProviders(updatedProviders);
        setChangesMade(false);
      } else {
        // Create a new record if none exists
        console.log("No Sentinel settings found, initializing...");
        // Initialize with default values
        initializeSettings(userId);
      }
    } catch (error) {
      console.error("Error loading Sentinel settings:", error);
      setToast({
        message: "Unable to load Sentinel settings",
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Sentinel settings if needed
  const initializeSettings = async (userId: string) => {
    try {
      console.log('Initializing sentinel settings for user ID:', userId);
      const initialSettings = {
        user_id: userId,
        enabled: false,
        provider: [],
        provider_config: {},
        notification_threshold: null,
        notification_cooldown_minutes: 60
      };
      
      const settings = await updateSentinelSettings(initialSettings);
      if (settings) {
        console.log('Successfully initialized sentinel settings:', settings);
        setSentinelSettings(settings);
      }
    } catch (error) {
      console.error("Error initializing Sentinel settings:", error);
    }
  };

  // Load settings on load or when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('Loading sentinel settings for user:', user.id);
      loadSentinelSettings(user.id);
    }
  }, [user]);

  // Don't refresh automatically if changes are in progress
  useEffect(() => {
    if (!user?.id || changesMade) return;
    
    const refreshInterval = setInterval(() => {
      loadSentinelSettings(user.id);
    }, 600000); // Refresh every 10 minutes
    
    return () => clearInterval(refreshInterval);
  }, [user, changesMade]);

  const toggleProvider = (providerId: string) => {
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
    } else {
      setExpandedProvider(providerId);
    }
  };

  const toggleProviderActive = (providerId: string) => {
    const updatedProviders = providers.map(provider => 
      provider.id === providerId 
        ? { ...provider, isActive: !provider.isActive } 
        : provider
    );
    setProviders(updatedProviders);
    setChangesMade(true);
    
    // Synchroniser immédiatement avec la base de données
    saveSettings(updatedProviders);
  };

  const handleConfigChange = (providerId: string, value: string) => {
    const updatedProviders = providers.map(provider => 
      provider.id === providerId 
        ? { ...provider, configValue: value } 
        : provider
    );
    setProviders(updatedProviders);
    setChangesMade(true);
  };

  // Centralized function to save settings
  const saveSettings = async (updatedProviders = providers, sentinelState = sentinelActive) => {
    if (!user?.id) return false;
    
    try {
      const activeProviders = updatedProviders.filter(p => p.isActive).map(p => p.id);
      
      // Create/update provider configuration
      const providerConfig: Record<string, any> = 
        sentinelSettings?.provider_config ? { ...sentinelSettings.provider_config } : {};
      
      // Update active provider configurations
      updatedProviders.forEach(provider => {
        if (provider.isActive) {
          if (provider.id === 'email') {
            providerConfig.email = { address: provider.configValue };
          } else if (provider.id === 'twilio') {
            providerConfig.twilio = { 
              ...(providerConfig.twilio || {}),
              phone_number: provider.configValue 
            };
          } else if (provider.id === 'discord') {
            providerConfig.discord = { webhook_url: provider.configValue };
          } else if (provider.id === 'telegram') {
            const [botToken, chatId] = provider.configValue.split(':');
            if (botToken && chatId) {
              providerConfig.telegram = { bot_token: botToken, chat_id: chatId };
            }
          }
        }
      });
      
      // Prepare data to update, preserving ID if available
      const updateData: Partial<SentinelWallet> & { user_id: string } = {
        user_id: user.id,
        enabled: sentinelState, // Use state passed as parameter
        provider: activeProviders,
        provider_config: providerConfig,
        notification_threshold: sentinelSettings?.notification_threshold || null,
        notification_cooldown_minutes: sentinelSettings?.notification_cooldown_minutes || 60
      };
      
      // If we already have an ID, include it to ensure updating the existing record
      if (sentinelSettings?.id) {
        updateData.id = sentinelSettings.id;
      }
      
      console.log('Saving sentinel settings:', updateData);
      const updatedSettings = await updateSentinelSettings(updateData);
      
      if (updatedSettings) {
        console.log('Successfully updated sentinel settings:', updatedSettings);
        setSentinelSettings(updatedSettings);
        setChangesMade(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving settings:", error);
      setToast({
        message: "Unable to save settings",
        type: 'error'
      });
      return false;
    }
  };

  const saveProviderConfig = async (providerId: string) => {
    if (!user?.id) return;
    
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;
    
    try {
      const success = await saveSettings();
      
      if (success) {
        setToast({
          message: `${provider.name} configuration saved`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      setToast({
        message: "Unable to save configuration",
        type: 'error'
      });
    }
  };

  const toggleSentinelActive = async () => {
    if (!user?.id) return;
    
    // Don't change state immediately, wait for server response
    const newState = !sentinelActive;
    setChangesMade(true);
    
    try {
      // Update value in parameters before calling saveSettings
      const success = await saveSettings(providers, newState);
      
      if (success) {
        // Only change local state after server confirmation
        setSentinelActive(newState);
        setToast({
          message: `Sentinel mode ${newState ? 'enabled' : 'disabled'}`,
          type: 'success'
        });
      } else {
        setToast({
          message: "Unable to change Sentinel mode",
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Error updating Sentinel mode:", error);
      setToast({
        message: "Unable to change Sentinel mode",
        type: 'error'
      });
    }
  };

  // Style pour le switch toggle
  const ToggleSwitch = ({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) => (
    <div className="relative" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <div 
        className={`block w-8 h-4 sm:w-10 sm:h-5 rounded-full transition-colors duration-200 cursor-pointer ${
          isActive ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <div 
          className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-transform duration-200 ${
            isActive ? 'transform translate-x-4 sm:translate-x-5' : ''
          }`}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-white">Loading settings...</div>
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
            <CardTitle className="text-white text-base sm:text-lg font-medium">Sentinel Settings</CardTitle>
            <CardDescription className="text-gray-400 text-xs sm:text-sm">
              Sentinel mode actively monitors your wallet and alerts you
            </CardDescription>
          </div>
          <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
            <Bot className="h-3 w-3 mr-1" /> AI Protected
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 sm:p-3 h-[calc(100%-70px)] flex flex-col overflow-hidden">
        {/* Switch to enable/disable */}
        <div className="flex items-center justify-between p-2 sm:p-3 rounded-md">
          <div className="flex items-center">
            <div className={`mr-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full ${sentinelActive ? 'bg-blue-600' : 'bg-gray-600'} flex items-center justify-center`}>
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />
            </div>
            <label htmlFor="sentinel-mode" className="text-white text-xs sm:text-sm cursor-pointer">
              Enable Sentinel Mode
            </label>
          </div>
          <div className="relative">
            <input 
              id="sentinel-mode"
              type="checkbox"
              checked={sentinelActive}
              onChange={toggleSentinelActive}
              className="sr-only"
            />
            <div 
              onClick={toggleSentinelActive}
              className={`block w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors duration-300 cursor-pointer ${
                sentinelActive ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div 
                className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-transform duration-300 ${
                  sentinelActive ? 'transform translate-x-5 sm:translate-x-6' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Notification providers list */}
        <div className="mt-2 sm:mt-3 rounded-md flex-1 overflow-y-auto">
          <div className="p-2 sm:p-3 text-xs sm:text-sm text-white font-medium">
            Notification Providers
          </div>
          
          <div className="space-y-0.5 sm:space-y-1 mx-1 sm:mx-2 mb-2 sm:mb-3">
            {providers.map(provider => (
              <div key={provider.id} className="overflow-hidden rounded-md">
                {/* Provider header */}
                <div 
                  className="bg-[#151d2e] p-2 cursor-pointer hover:bg-[#1b2638]"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center flex-1"
                      onClick={() => toggleProvider(provider.id)}
                    >
                      {provider.icon}
                      <span className="text-gray-200 text-xs sm:text-sm">{provider.name}</span>
                      {expandedProvider === provider.id ? 
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ml-1" /> : 
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ml-1" />
                      }
                    </div>
                    <ToggleSwitch 
                      isActive={provider.isActive} 
                      onToggle={() => toggleProviderActive(provider.id)} 
                    />
                  </div>
                </div>
                
                {/* Provider content */}
                {expandedProvider === provider.id && (
                  <div className="bg-[#101827] p-2 sm:p-3 space-y-2 border-l-2 border-l-blue-600/40">
                    <p className="text-[10px] sm:text-xs text-gray-300">{provider.configField}:</p>
                    <div className="flex gap-2">
                      <Input 
                        placeholder={provider.placeholder}
                        className="h-7 sm:h-8 text-xs bg-[#151d2e] border-0 flex-1"
                        disabled={!provider.isActive}
                        value={provider.configValue}
                        onChange={(e) => handleConfigChange(provider.id, e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 sm:h-8 px-2 text-xs border-blue-800 hover:bg-blue-900/20 ${
                          provider.isActive ? 'text-blue-400' : 'text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!provider.isActive}
                        onClick={() => saveProviderConfig(provider.id)}
                      >
                        Save
                      </Button>
                    </div>
                    {provider.id === 'telegram' && (
                      <p className="text-[10px] text-gray-400">
                        Format: 123456789:ABCdef...xyz_12345:67890
                      </p>
                    )}
                    {provider.id === 'twilio' && (
                      <p className="text-[10px] text-gray-400">
                        Enter your phone number with country code
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 