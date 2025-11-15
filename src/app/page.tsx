import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Bot,
  Zap,
  Shield,
  Brain,
  Sparkles,
  Coins,
  Users,
  TrendingUp,
  Lock,
  Globe,
  CheckCircle2,
  Wallet,
  Clock,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Globe2
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent">
      {/* AI Genesis Hackathon Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-2 text-center text-sm font-medium">
        <span>AI Genesis Hackathon - </span>
        <a
          href="https://lablab.ai/event/ai-genesis"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-100 transition-colors"
        >
          Learn more
        </a>
      </div>

      {/* Header */}
      <header className="fixed top-8 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/paystream-logo.svg"
              alt="Paystream AI"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
            <h1 className="text-xl font-semibold text-gray-900">
              Paystream AI
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="h-9 flex items-center justify-center px-4 text-sm font-normal tracking-wide text-gray-700 rounded-full transition-all ease-out active:scale-95 hover:bg-gray-100">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-blue-600 h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-blue-700 transition-all ease-out active:scale-95">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="bg-blue-600 h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-blue-700 transition-all ease-out active:scale-95">
                  Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full relative overflow-hidden pt-8 bg-transparent">
        <div className="relative flex flex-col items-center w-full px-6">
          {/* Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 -z-10 h-[600px] md:h-[800px] w-full rounded-b-xl" style={{
              background: 'radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #93c5fd 100%)'
            }}></div>
          </div>
          {/* Decorative Vertical Lines with Gradient */}
          <div className="absolute top-0 left-4 md:left-10 h-full w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent hidden md:block"></div>
          <div className="absolute top-0 right-4 md:right-10 h-full w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent hidden md:block"></div>

          <div className="relative z-10 pt-24 pb-12 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center text-center">
            <p className="border border-blue-200 bg-blue-50 rounded-full text-sm h-8 px-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-700">AI-Powered Payroll Revolution</span>
            </p>
            <div className="flex flex-col items-center justify-center gap-5">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium tracking-tighter text-balance text-center text-gray-900">
                The Future of{' '}
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Blockchain Payroll
                </span>
              </h1>
              <p className="text-base md:text-lg text-center text-gray-600 font-medium text-balance leading-relaxed tracking-tight max-w-3xl">
                Streamline your payroll with AI-powered automation, instant USDC payments on Arc blockchain,
                and intelligent insights from Penny AI - your personal payroll assistant.
              </p>
            </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="bg-blue-600 h-10 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white px-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-blue-700 transition-all ease-out active:scale-95">
                  Try for Free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="bg-blue-600 h-10 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white px-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-blue-700 transition-all ease-out active:scale-95">
                  Dashboard
                </button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="h-10 flex items-center justify-center px-6 text-sm font-normal tracking-wide text-gray-900 rounded-full transition-all ease-out active:scale-95 bg-white border border-gray-200 hover:bg-gray-50">
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Instant setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>24/7 AI support</span>
            </div>
          </div>
          </div>

          {/* Dashboard Preview Image */}
          <div className="relative z-10 mt-16 mb-20 w-full max-w-6xl mx-auto px-4">
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 opacity-60"></div>
              <Image
                src="/dashboard-preview.png"
                alt="Paystream AI Dashboard Preview"
                width={1920}
                height={1080}
                className="relative w-full h-auto rounded-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-white relative">
        {/* Connecting Lines from Hero */}
        <div className="absolute top-0 left-4 md:left-10 h-full w-px bg-gradient-to-b from-gray-300 via-gray-200 to-transparent hidden md:block"></div>
        <div className="absolute top-0 right-4 md:right-10 h-full w-px bg-gradient-to-b from-gray-300 via-gray-200 to-transparent hidden md:block"></div>

        {/* Top Separation Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1 text-gray-900 mb-4">
              The Payroll Problem
            </h2>
            <p className="text-gray-600 text-center text-balance font-medium max-w-2xl mx-auto">
              Traditional payroll systems are outdated, slow, and expensive
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Manual Processing',
                description: 'Hours spent on repetitive data entry, calculations, and paperwork that could be automated.',
                icon: <Clock className="w-8 h-8 text-blue-600" />
              },
              {
                title: 'High Costs',
                description: 'Traditional payroll services charge excessive fees and require long-term commitments.',
                icon: <DollarSign className="w-8 h-8 text-blue-600" />
              },
              {
                title: 'Slow Payments',
                description: 'Bank transfers take days to process, leaving employees waiting for their hard-earned money.',
                icon: <Clock className="w-8 h-8 text-blue-600" />
              },
              {
                title: 'Compliance Risks',
                description: 'Complex regulations and manual processes increase the risk of costly errors and penalties.',
                icon: <AlertTriangle className="w-8 h-8 text-blue-600" />
              },
              {
                title: 'Limited Insights',
                description: 'Basic reporting and analytics make it hard to understand payroll trends and optimize costs.',
                icon: <BarChart3 className="w-8 h-8 text-blue-600" />
              },
              {
                title: 'No Global Support',
                description: 'International payments are complicated, expensive, and subject to exchange rate volatility.',
                icon: <Globe2 className="w-8 h-8 text-blue-600" />
              },
            ].map((problem) => (
              <div
                key={problem.title}
                className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              >
                <div className="mb-4">{problem.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{problem.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white relative">
        {/* Connecting Lines continuing from Problem section */}
        <div className="absolute top-0 left-4 md:left-10 h-full w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent hidden md:block"></div>
        <div className="absolute top-0 right-4 md:right-10 h-full w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent hidden md:block"></div>

        {/* Top Separation Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1 text-gray-900 mb-4">
              Everything You Need for Modern Payroll
            </h2>
            <p className="text-gray-600 text-center text-balance font-medium max-w-2xl mx-auto">
              Powered by cutting-edge AI and blockchain technology to make payroll effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
            {[
              {
                icon: <Bot className="w-10 h-10 text-blue-600" />,
                title: 'Penny AI Assistant',
                description: 'Your intelligent payroll companion powered by Google Gemini 2.0 Flash, helping you with queries, insights, and automation.'
              },
              {
                icon: <Coins className="w-10 h-10 text-blue-600" />,
                title: 'Instant USDC Payments',
                description: 'Lightning-fast payroll disbursement using USDC stablecoin on Arc blockchain with Circle Developer-Controlled Wallets.'
              },
              {
                icon: <Zap className="w-10 h-10 text-blue-600" />,
                title: 'Batch Processing',
                description: 'Process hundreds of payments in seconds with our optimized batch transaction system on Arc Testnet.'
              },
              {
                icon: <Brain className="w-10 h-10 text-blue-600" />,
                title: 'Semantic Search',
                description: 'Find employees using natural language with AI-powered semantic search through Qdrant vector database.'
              },
              {
                icon: <Shield className="w-10 h-10 text-blue-600" />,
                title: 'Enterprise Security',
                description: 'Bank-level security with blockchain transparency and end-to-end encryption for all transactions.'
              },
              {
                icon: <TrendingUp className="w-10 h-10 text-blue-600" />,
                title: 'Real-time Analytics',
                description: 'Track payroll metrics, employee data, and transaction history with beautiful charts and insights.'
              },
              {
                icon: <Users className="w-10 h-10 text-blue-600" />,
                title: 'Smart Employee Management',
                description: 'Manage employee profiles, wallets, and payment history with OCR document scanning and AI verification.'
              },
              {
                icon: <Globe className="w-10 h-10 text-blue-600" />,
                title: 'Multi-Modal AI',
                description: 'Upload documents, scan IDs, transcribe audio - Penny handles images, PDFs, audio files with multimodal AI.'
              },
              {
                icon: <Lock className="w-10 h-10 text-blue-600" />,
                title: 'Workflow Approvals',
                description: 'Powered by Opus API for sophisticated approval workflows with AI-driven decision support.'
              },
              {
                icon: <Wallet className="w-10 h-10 text-blue-600" />,
                title: 'Developer-Controlled Wallets',
                description: 'Secure wallet infrastructure with Circle API integration for seamless USDC management.'
              },
            ].map((feature, idx) => (
              <div
                key={feature.title}
                className="p-8 bg-white min-h-[280px] flex flex-col"
              >
                <div className="mb-6">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white relative">
        {/* Connecting Lines continuing from Features section */}
        <div className="absolute top-0 left-4 md:left-10 h-full w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent hidden md:block"></div>
        <div className="absolute top-0 right-4 md:right-10 h-full w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent hidden md:block"></div>

        {/* Top Separation Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1 text-gray-900 mb-4">
              Built with Best-in-Class Technology
            </h2>
            <p className="text-gray-600 text-center text-balance font-medium max-w-2xl mx-auto">
              We leverage the most advanced AI and blockchain infrastructure
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Google Gemini 2.0',
                desc: 'AI Engine',
                logoUrl: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-gemini-icon.png'
              },
              {
                name: 'Arc Blockchain',
                desc: 'Payment Network',
                logoUrl: 'https://cdn.prod.website-files.com/685311a976e7c248b5dfde95/688f6e47eca8d8e359537b5f_logo-ondark.svg'
              },
              {
                name: 'Circle USDC',
                desc: 'Stablecoin',
                logoUrl: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn2.hubspot.net%2Fhubfs%2F6778953%2FCircle%2520logo%25202020%2Flogo%402x.png&f=1&nofb=1&ipt=1e03e4bbbdd93b82f91669f6c3c352fcb55a7e1869bc0de2426399548877e529'
              },
              {
                name: 'Qdrant',
                desc: 'Vector Search',
                logoUrl: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F73504361%3Fv%3D4&f=1&nofb=1&ipt=193df94201359696a6101d425f02d6d673fcaa22d35f0a0cd3bea0ac49b2fc1d'
              },
              {
                name: 'AI/ML API',
                desc: 'Machine Learning',
                logoUrl: 'https://aimlapi.com/favicon.ico'
              },
              {
                name: 'Opus API',
                desc: 'Workflows',
                logoUrl: 'https://www.opus.com/favicon.ico'
              },
              {
                name: 'ElevenLabs',
                desc: 'Voice AI',
                logoUrl: 'https://elevenlabs.io/favicon.ico'
              },
            ].map((tech) => (
              <div
                key={tech.name}
                className="p-6 bg-white border-2 border-gray-200 rounded-xl text-center transition-all w-40"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <img
                    src={tech.logoUrl}
                    alt={`${tech.name} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="font-bold text-gray-900 mb-1 text-sm">{tech.name}</p>
                <p className="text-xs text-gray-600">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-500 relative">
        {/* Connecting Lines continuing from Tech Stack section */}
        <div className="absolute top-0 left-4 md:left-10 h-full w-px bg-gradient-to-b from-gray-200 via-blue-400 to-transparent opacity-50 hidden md:block"></div>
        <div className="absolute top-0 right-4 md:right-10 h-full w-px bg-gradient-to-b from-gray-200 via-blue-400 to-transparent opacity-50 hidden md:block"></div>

        {/* Top Separation Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-medium tracking-tighter text-white mb-6">
            Ready to Transform Your Payroll?
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 font-medium">
            Join the future of blockchain payroll with AI-powered automation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="bg-white text-blue-600 font-semibold text-sm h-10 w-fit px-6 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-all ease-out active:scale-95">
                  Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="bg-white text-blue-600 font-semibold text-sm h-10 w-fit px-6 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-all ease-out active:scale-95">
                  Open Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400 relative">
        {/* Top Separation Line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/paystream-logo.svg"
              alt="Paystream AI"
              width={32}
              height={32}
              className="flex-shrink-0"
            />
            <h1 className="text-xl font-bold text-white">Paystream AI</h1>
          </div>
          <p className="text-sm mb-4">
            AI-Powered Blockchain Payroll Platform
          </p>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} Paystream AI. Built with Next.js, Google Gemini, and Arc Blockchain.
          </p>
        </div>
      </footer>
    </main>
  );
}
