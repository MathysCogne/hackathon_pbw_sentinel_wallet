'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import { MessageSquare, Lightbulb, TrendingUp, Bell, Wallet, ShieldCheck, X, Maximize2, Minimize2, Loader, CheckCircle2, Fingerprint, CheckCheck, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/hooks/useUser';

// Interface pour les messages
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  user?: string;
  isLoading?: boolean;
  isSignatureRequired?: boolean;
  action?: string;
}

// Interface pour les suggestions de prompts
interface PromptSuggestion {
  id: string;
  text: string;
  icon: React.ReactNode;
}

// Interface pour les réponses d'Eliza
interface ElizaResponse {
  user: string;
  text: string;
  action: string;
}

export function AIAssistant() {
  const { user, loading: userLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello ! How can I help you with your XRP wallet today ?",
      sender: 'ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      user: "Sentinel AI"
    }
  ]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Suggestions de prompts
  const promptSuggestions: PromptSuggestion[] = [
    {
      id: "security",
      text: "How can I secure my wallet with Sentinel AI ?",
      icon: <ShieldCheck className="w-4 h-4 text-green-400" />
    },
    {
      id: "transaction",
      text: "Can you make a transfer of XX XRP to..",
      icon: <TrendingUp className="w-4 h-4 text-blue-400" />
    },
    {
      id: "Create NFT",
      text: "Mint a new NFT for me using {walletXrpAddress} and the metadata at https://ipfs.io/ipfs/QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX, that's not transferable, with 2% fee",
      icon: <Bell className="w-4 h-4 text-amber-400" />
    },
    {
      id: "Task Transaction",
      text: "Create task to send 1 XRP to rE9LfuUp9mbaV964ASnTAxyE3k51mh82CA Every 1 minutes",
      icon: <TrendingUp className="w-4 h-4 text-purple-400" />
    },
	{
		id: "Create Escrow with condition",
		text: "Create task for an escrow of 200 XRP for to rE9LfuUp9mbaV964ASnTAxyE3k51mh82CA with secret phrase: 'xrpl is the future'",
		icon: <TrendingUp className="w-4 h-4 text-blue-400" />
	},
	{
		id: "Create DID",
		text: "Create a DID for my wallet",
		icon: <TrendingUp className="w-4 h-4 text-purple-400" />
	},
  ];

  // Effet pour mettre à jour l'input quand un prompt est sélectionné
  useEffect(() => {
    if (selectedPrompt) {
      setInput(selectedPrompt);
      setSelectedPrompt(null);
      // Ouvrir automatiquement le popup quand on sélectionne un prompt
      setIsExpanded(true);
    }
  }, [selectedPrompt]);

  // Placeholders pour l'input
  const inputPlaceholders = [
    "Ask me about your XRP wallet...",
    "How can I help you with crypto today?",
    "Need information about your transactions?",
    "Want to check market conditions?",
    "Ask about price predictions..."
  ];

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll to bottom when messages change
  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputFocus = () => {
    // Ouvrir la popup lorsque l'utilisateur clique sur l'input
    setIsExpanded(true);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;
    
    setIsSending(true);

    // Récupérer le message actuel avant de vider l'input
    const currentMessage = input;
    
    // Réinitialiser le champ d'entrée immédiatement
    setInput('');
    
    // Ajouter le message de l'utilisateur
    const newUserMessage: Message = {
      id: Date.now(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Afficher d'abord un message de chargement avec animation
      const loadingMessageId = Date.now() + 1;
      setMessages(prev => [...prev, {
        id: loadingMessageId,
        text: "Processing your request...",
        sender: 'ai',
        timestamp: new Date(),
        user: "Sentinel AI",
        isLoading: true
      }]);
      
      // Après 1 seconde, remplacer par le message de signature
      const signMessageTimeoutId = setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessageId 
            ? { 
                ...msg, 
                text: "Please sign transaction on your Xaman App...",
                isLoading: false,
                isSignatureRequired: true
              }
            : msg
        ));
      }, 2000);
      
      // Créer les données du formulaire pour l'API Eliza
      const formData = new FormData();
      formData.append("text", currentMessage);
      formData.append("userId", user.id);
      
      // Faire la requête à l'API Eliza
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL_ELIZA}/message`, {
        method: 'POST',
        body: formData,
        redirect: 'follow'
      });
      
      // Nettoyer le timeout si la réponse arrive avant 1 seconde
      clearTimeout(signMessageTimeoutId);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      // Analyser la réponse
      const data: ElizaResponse[] = await response.json();
      
      // Supprimer le message de chargement
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      
      // Ajouter les réponses d'Eliza
      if (data && data.length > 0) {
        const elizaMessages = data.map((item, index) => ({
          id: Date.now() + index + 2,
          text: item.text,
          sender: 'ai' as const,
          timestamp: new Date(),
          user: item.user,
          action: item.action
        }));
        
        setMessages(prev => [...prev, ...elizaMessages]);
      } else {
        // Si aucune réponse, afficher un message d'erreur
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: "Sorry, I couldn't process your request at this time.",
          sender: 'ai',
          timestamp: new Date(),
          user: "Sentinel AI"
        }]);
      }
    } catch (error) {
      console.error("Error sending message to Eliza:", error);
      
      // Afficher un message d'erreur
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        text: "An error occurred while processing your request. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
        user: "Sentinel AI"
      }]);
    } finally {
      setIsSending(false);
    }
  };

  // Fonction pour sélectionner une suggestion et la mettre dans l'input
  const handleSuggestionClick = (suggestion: string) => {
    setSelectedPrompt(suggestion);
  };

  // Format de l'heure
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Changement d'input pour le nouveau composant
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Soumission du formulaire pour le nouveau composant
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Fonction pour gérer l'affichage des messages en fonction de l'état du popup
  const displayMessages = () => {
    // Si le popup est fermé, afficher uniquement les 2 derniers messages
    if (!isExpanded) {
      return messages.slice(-2);
    }
    // Sinon, afficher tous les messages
    return messages;
  };

  // Fonction pour basculer l'état du popup
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Fonction auxiliaire pour déterminer l'icône à afficher en fonction de l'action
  const getActionIcon = (action: string) => {
    switch(action) {
      case 'TRANSACTION':
        return <TrendingUp className="w-4 h-4" />;
      case 'ESCROW':
        return <Wallet className="w-4 h-4" />;
      case 'NFT_MINT':
        return <Bell className="w-4 h-4" />;
      case 'DID_CREATE':
        return <Fingerprint className="w-4 h-4" />;
      case 'TASK_CREATED':
        return <Bell className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={false}
        animate={{
          position: isExpanded ? 'fixed' : 'relative',
          zIndex: isExpanded ? 50 : 10,
          inset: isExpanded ? '0' : 'auto',
          height: isExpanded ? '100vh' : 'auto',
          width: isExpanded ? '100vw' : 'auto',
        }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center"
      >
        <motion.div
          animate={{
            width: isExpanded ? 'min(100%, 1000px)' : '100%',
            height: isExpanded ? 'min(100%, 95vh)' : '100%',
            margin: isExpanded ? 'auto' : '0',
          }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full"
        >
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={toggleExpanded}
            />
          )}
          
          <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden flex flex-col relative z-10 py-0 pt-4">
            <CardHeader className="flex flex-row justify-between items-center">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 text-blue-400 mr-3" />
                <div>
                  <CardTitle className="text-white text-base sm:text-lg font-medium">Sentinel AI Assistant</CardTitle>
                  <CardDescription className="text-gray-400 text-xs sm:text-sm">Your intelligent XRP wallet guardian</CardDescription>
                </div>
              </div>
              <button 
                onClick={toggleExpanded}
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-[#151d2e]"
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 h-full">
              <div 
                className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-4 sm:space-y-5"
                style={{ 
                  scrollbarWidth: 'none', /* Firefox */
                  msOverflowStyle: 'none', /* IE and Edge */
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none; /* Chrome, Safari and Opera */
                  }
                `}</style>
                {userLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="ml-2 text-gray-400">Connecting to your wallet...</span>
                  </div>
                ) : !user ? (
                  <div className="flex justify-center items-center h-full flex-col">
                    <div className="bg-[#151d2e] rounded-lg p-6 text-center max-w-md">
                      <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                      <h3 className="text-white text-lg font-medium mb-2">Authentication Required</h3>
                      <p className="text-gray-400 mb-4">Please connect your XRP wallet to access the AI assistant.</p>
                    </div>
                  </div>
                ) : (
                  displayMessages().map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} px-4 sm:px-6`}
                    >
                      <div 
                        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-5 py-3.5 sm:px-6 sm:py-4 text-sm ${
                          message.sender === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-[#151d2e] text-gray-200'
                        }`}
                      >
                        {message.user && message.sender === 'ai' && (
                          <div className="text-xs text-blue-400 mb-1 font-medium">{message.user}</div>
                        )}
                        
                        {message.isLoading ? (
                          <div className="flex items-center space-x-3 py-2">
                            <motion.div
                              className="w-5 h-5 flex items-center justify-center relative"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                            >
                              <div className="absolute inset-0 rounded-full border border-blue-400/30 border-t-blue-400" />
                            </motion.div>
                            <p className="text-blue-300 font-medium">{message.text}</p>
                          </div>
                        ) : message.isSignatureRequired ? (
                          <div className="flex items-center space-x-3 py-2">
                            <motion.div
                              animate={{ 
                                opacity: [0.5, 1, 0.5],
                                scale: [0.95, 1, 0.95]
                              }}
                              transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="text-blue-400"
                            >
                              <Fingerprint className="w-5 h-5" />
                            </motion.div>
                            <p className="text-blue-300 font-medium">{message.text}</p>
                          </div>
                        ) : message.action && message.action !== "NONE" ? (
                          <div className="mb-2">
                            <div className="mb-3 leading-relaxed tracking-wide">{message.text}</div>
                            <motion.div 
                              className="bg-[#0d1b2a] rounded-md p-3 border border-blue-900/30"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="flex items-center mb-2">
                                <div className="bg-blue-500/10 rounded-full p-1.5 mr-2 text-blue-400">
                                  {getActionIcon(message.action)}
                                </div>
                                <p className="text-blue-300 text-xs font-medium">Action effectuée</p>
                                <div className="ml-auto flex items-center text-green-400">
                                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                  <span className="text-xs">Confirmée</span>
                                </div>
                              </div>
                              <div className="flex items-center text-xs text-gray-400">
                                <span>{message.action.replace('_', ' ').toLowerCase()}</span>
                                <ArrowRight className="w-3 h-3 mx-1" />
                                <span className="text-gray-300">complété avec succès</span>
                              </div>
                            </motion.div>
                          </div>
                        ) : (
                          <div className="mb-2 leading-relaxed tracking-wide">{message.text}</div>
                        )}
                        
                        <div 
                          className={`text-[10px] sm:text-xs ${
                            message.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="bg-[#0c131f] border-t border-[#1b2638] p-4">
                {/* Section de l'input, toujours visible */}
                <div>
                  <div className="mx-auto max-w-3xl">
                    <PlaceholdersAndVanishInput
                      placeholders={inputPlaceholders}
                      onChange={handleInputChange}
                      onSubmit={handleFormSubmit}
                      externalValue={input}
                      onFocus={handleInputFocus}
                      disabled={userLoading || !user || isSending}
                    />
                  </div>
                </div>
                
                {/* Section des suggestions de prompts - affichée uniquement en mode popup */}
                {isExpanded && user && (
                  <div className="mt-5 mx-auto max-w-3xl">
                    <div className="w-full">
                      <p className="text-xs text-gray-500 flex items-center mb-3">
                        <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                        Suggested prompts:
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {promptSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion.text)}
                          className="bg-[#151d2e] hover:bg-[#1b2638] transition-colors p-3.5 rounded-md text-xs text-gray-200 cursor-pointer border border-[#1b2638] hover:border-blue-600/30"
                        >
                          <div className="flex items-center mb-1.5">
                            <div className="p-1.5 rounded-md bg-[#101827] mr-2">
                              {suggestion.icon}
                            </div>
                            <span className="font-medium">{suggestion.id.charAt(0).toUpperCase() + suggestion.id.slice(1)}</span>
                          </div>
                          <p className="text-gray-400 line-clamp-2">{suggestion.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 