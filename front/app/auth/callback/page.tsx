import { verifyXummPayload, createSessionAction } from '@/app/actions';
import Link from 'next/link';
import { HeroHighlight } from '@/components/ui/hero-highlight';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { ShieldCheck, Loader2, Wallet, Zap, Bot, HardDrive, ArrowRight } from 'lucide-react';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="relative rounded-2xl border border-neutral-800 p-1 overflow-hidden animate-fadeIn">
    <GlowingEffect
      blur={0}
      borderWidth={3}
      spread={80}
      glow={true}
      disabled={false}
      proximity={64}
      inactiveZone={0.01}
    />
    <div className="flex items-start gap-3 p-4 bg-black/40 rounded-xl backdrop-blur-sm">
      <div className="mt-1 w-fit rounded-lg border border-neutral-700 p-1.5">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-neutral-400">{description}</p>
      </div>
    </div>
  </div>
);

export default async function CallbackPage(props: Props) {
  // Récupération du paramètre avec await
  const searchParams = await props.searchParams;
  const payloadId = searchParams.payloadId as string;
  
  console.log('Callback received with payloadId from URL:', payloadId);
  
  if (!payloadId) {
    // Si pas de payloadId, on affiche une page avec un loader et un script qui va vérifier le localStorage
    return (
      <div className="h-screen w-full overflow-hidden">
        <div className="fixed inset-0 bg-black">
          <HeroHighlight className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
              <div className="relative p-3 rounded-full bg-indigo-500/20 mb-6 animate-pulse">
                <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
              </div>
              
              <div className="text-center animate-fadeIn">
                <h1 className="text-2xl font-bold text-white mb-4">Connecting to XRPL...</h1>
                <p className="text-neutral-400 max-w-md mx-auto">
                  We're verifying your authentication information. This will only take a moment.
                </p>
              </div>

              <div className="mt-8 w-full max-w-md opacity-0 animate-fadeInDelayed">
                <h2 className="text-lg font-medium text-white mb-4">Explore what's next</h2>
                <div className="grid gap-3">
                  <FeatureCard
                    icon={<ShieldCheck className="h-5 w-5 text-indigo-400" />}
                    title="Secure Your Assets"
                    description="Multi-signature protection powered by AI analysis"
                  />
                  <FeatureCard
                    icon={<Zap className="h-5 w-5 text-indigo-400" />}
                    title="Automated Tasks"
                    description="Schedule and automate transactions with natural language"
                  />
                  <FeatureCard
                    icon={<HardDrive className="h-5 w-5 text-indigo-400" />}
                    title="Ledger Integration"
                    description="Connect your hardware wallet for enhanced security"
                  />
                </div>
              </div>

              <div id="error-message" style={{ display: 'none' }}>
                <div className="mt-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-white animate-fadeIn">
                  <p>No authentication information found. Please try again.</p>
                  <Link 
                    href="/"
                    className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-2 w-full"
                  >
                    Back to home <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              
              {/* Script pour récupérer le payloadId depuis localStorage */}
              <script dangerouslySetInnerHTML={{ __html: `
                (function() {
                  // Vérifier que l'on est bien dans un environnement navigateur
                  if (typeof window === 'undefined') return;

                  if (window.localStorage) {
                    const storedId = localStorage.getItem('xumm_payload_id');
                    if (storedId) {
                      console.log('Found payloadId in localStorage:', storedId);
                      window.location.href = '/auth/callback?payloadId=' + storedId;
                    } else {
                      console.error('No payloadId found in URL or localStorage');
                      if (document.getElementById('error-message')) {
                        document.getElementById('error-message').style.display = 'block';
                      }
                    }
                  } else {
                    console.error('localStorage is not available');
                    if (document.getElementById('error-message')) {
                      document.getElementById('error-message').style.display = 'block';
                    }
                  }
                })();
              `}} />
            </div>
          </HeroHighlight>
        </div>
      </div>
    );
  }
  
  // Check payload status
  const result = await verifyXummPayload(payloadId);
  
  if (result.success && result.user && result.user.walletAddress) {
    // Page avec formulaire pour définir le cookie via l'action serveur existante
    return (
      <div className="h-screen w-full overflow-hidden">
        <div className="fixed inset-0 bg-black">
          <HeroHighlight className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
              <div className="relative p-3 rounded-full bg-green-500/20 mb-6 animate-scaleIn">
                <ShieldCheck className="h-12 w-12 text-green-400" />
              </div>
              
              <div className="text-center animate-fadeIn">
                <h1 className="text-2xl font-bold text-white mb-2">Authentication Successful!</h1>
                <p className="text-neutral-400 max-w-md mx-auto">
                  Your wallet is now connected. Setting up your dashboard...
                </p>
              </div>
              
              <div className="w-full h-1 bg-neutral-800 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progressBar"></div>
              </div>

              <div className="mt-4 w-full max-w-md opacity-0 animate-fadeInDelayed">
                <h2 className="text-lg font-medium text-white mb-4">What's Next</h2>
                <div className="grid gap-3">
                  <FeatureCard
                    icon={<Wallet className="h-5 w-5 text-green-400" />}
                    title="Access Your Wallet"
                    description="View balances and transaction history"
                  />
                  <FeatureCard
                    icon={<Bot className="h-5 w-5 text-green-400" />}
                    title="Configure AI Assistant"
                    description="Set up your AI to monitor and manage transactions"
                  />
                </div>
              </div>
              
              <form id="auth-form" action={createSessionAction}>
                <input type="hidden" name="walletAddress" value={result.user.walletAddress} />
                <button 
                  type="submit"
                  id="submit-button"
                  style={{ display: 'none' }}
                  className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                >
                  Continue
                </button>
              </form>
              
              <script dangerouslySetInnerHTML={{ __html: `
                (function() {
                  // Vérifier que l'on est bien dans un environnement navigateur
                  if (typeof window === 'undefined') return;
                  
                  // Vérifier si le formulaire a déjà été soumis pour éviter les boucles
                  if (window.sessionStorage && window.sessionStorage.getItem('auth_form_submitted')) {
                    console.log('Form already submitted, redirecting directly...');
                    window.location.href = '/dashboard';
                  } else {
                    // Marquer le formulaire comme soumis
                    if (window.sessionStorage) {
                      window.sessionStorage.setItem('auth_form_submitted', 'true');
                    }
                    
                    // Nettoyer localStorage
                    if (window.localStorage) {
                      window.localStorage.removeItem('xumm_payload_id');
                    }
                    console.log('Authentication successful, preparing to submit form...');
                    
                    // S'assurer que le DOM est entièrement chargé avant de soumettre le formulaire
                    if (document.readyState === 'complete' || document.readyState === 'interactive') {
                      console.log('DOM ready, submitting form immediately');
                      setTimeout(function() {
                        document.getElementById('submit-button').click();
                      }, 2500); // Attendre 2.5 secondes pour montrer l'animation
                    } else {
                      console.log('DOM not ready, waiting for DOMContentLoaded event');
                      document.addEventListener('DOMContentLoaded', function() {
                        console.log('DOM now loaded, submitting form');
                        setTimeout(function() {
                          document.getElementById('submit-button').click();
                        }, 2500); // Attendre 2.5 secondes pour montrer l'animation
                      });
                    }
                    
                    // Redirection manuelle en cas d'échec du formulaire
                    setTimeout(function() {
                      console.log('Fallback: Redirecting manually after timeout');
                      window.location.href = '/dashboard';
                    }, 4000);
                  }
                })();
              `}} />
            </div>
          </HeroHighlight>
        </div>
      </div>
    );
  }
  
  // In case of failure
  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="fixed inset-0 bg-black">
        <HeroHighlight className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
            <div className="relative p-3 rounded-full bg-red-500/20 mb-4 animate-scaleIn">
              <div className="h-12 w-12 flex items-center justify-center text-red-400">❌</div>
            </div>
            
            <div className="text-center animate-fadeIn">
              <h1 className="text-2xl font-bold text-white mb-3">Authentication Failed</h1>
              <p className="text-neutral-400 max-w-md mx-auto mb-6">
                {result.message || "We couldn't authenticate your wallet. Please try again."}
              </p>
              
              <Link 
                href="/"
                className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-2 mx-auto w-full max-w-xs"
              >
                Back to home <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </HeroHighlight>
      </div>
    </div>
  );
} 