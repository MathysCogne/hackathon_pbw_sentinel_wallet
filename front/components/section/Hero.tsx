import { motion } from 'framer-motion';
import { HeroHighlight, Highlight } from '../ui/hero-highlight';
import { GlowingEffect } from '../ui/glowing-effect';
import { Shield, Bot, Zap, HardDrive } from 'lucide-react';
import { XummConnect } from '../features/XummConnect';
import { TEXT } from '@/constants/text';
import { Button } from '../ui/button';

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  emoji?: string;
}

const GridItem = ({ area, icon, title, description, emoji }: GridItemProps) => {
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`min-h-[9rem] sm:min-h-[10rem] list-none ${area}`}
    >
      <div className="relative h-full rounded-2.5xl border border-neutral-800 p-1 md:rounded-3xl md:p-1.5">
        <GlowingEffect
          blur={0}
          borderWidth={3}
          spread={100}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative flex h-full flex-col justify-between gap-2 overflow-hidden rounded-xl border-0.75 bg-black/40 p-3 sm:p-4 md:p-5 backdrop-blur-sm dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
          <div className="relative flex flex-1 flex-col justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-fit rounded-lg border border-neutral-700 p-1.5">
                {icon}
              </div>
              {emoji && <span className="text-xl">{emoji}</span>}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg/[1.2] font-semibold -tracking-4 md:text-xl/[1.4] text-balance text-white">
                {title}
              </h3>
              <h2 className="text-xs/[1.2] md:text-sm/[1.3] text-neutral-400">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
};

export const Hero = () => {
  return (
    <section className="h-screen w-full overflow-hidden">
      <div className="fixed inset-0 bg-black">
        <HeroHighlight className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
            <div className="flex flex-col gap-8 md:gap-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-700 dark:text-white max-w-4xl leading-tight sm:leading-relaxed text-center mx-auto">
                  Your intelligent assistant for secure and automated XRP transactions.
                  <br/>
                  <Highlight className="mx-2">
                  Not Just a Wallet. A Sentinel.
                  </Highlight>
                </h1>

                <div className="mt-10 flex flex-row gap-4 justify-center">
                  <XummConnect />
                  <Button 
                    className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white"
                    onClick={() => {}}
                  >
                    <HardDrive className="h-4 w-4" />
                    Connect with Ledger
                  </Button>
                </div>
              </motion.div>

              <ul className="w-full mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-4 md:grid-rows-2 lg:gap-5">
                <GridItem
                  area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/7]"
                  icon={<Shield className="h-5 w-5 text-neutral-400" />}
                  title="Multi-Sign By IA Agent"
                  description="Sentinel AI will automatically sign or rejet your transactions, based on the risk analysis."
                />

                <GridItem
                  area="md:[grid-area:1/7/2/13] xl:[grid-area:1/7/2/13]"
                  icon={<Bot className="h-5 w-5 text-neutral-400" />}
                  title="AI-Powered Automation"
                  description="Automate transactions with natural language commands for delayed or conditional payments."
                />

                <GridItem
                  area="md:[grid-area:2/1/3/7] xl:[grid-area:2/1/3/7]"
                  icon={<Zap className="h-5 w-5 text-neutral-400" />}
                  title="Task Automation"
                  description="Sentinel AI will automatically send your transactions, based on your task."
                />

                <GridItem 
                  area="md:[grid-area:2/7/3/13] xl:[grid-area:2/7/3/13]"
                  icon={<Zap className="h-5 w-5 text-neutral-400" />}
                  title="Just simple, secure and fast"
                  description="Sentinel AI is a simple, secure and fast way to send your transactions."
                />
              </ul>
            </div>
          </div>
        </HeroHighlight>
      </div>
    </section>
  );
}; 