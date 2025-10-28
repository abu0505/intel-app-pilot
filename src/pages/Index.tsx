import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, Zap, Target, TrendingUp, BookOpen, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsChecking(false);
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleQuickStart = () => {
    if (inputValue.trim()) {
      navigate("/auth", { state: { quickStart: inputValue } });
    } else {
      navigate("/auth");
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img
              src="/nexon-logo.svg"
              alt="Nexon AI logo"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Nexon AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleGetStarted}>
              Sign In
            </Button>
            <Button onClick={handleGetStarted}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 pt-32 pb-20 overflow-hidden">
        {/* Background Light Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Learning Platform</span>
          </div>
          
          <h1 className="mb-6 text-5xl md:text-7xl font-bold leading-tight">
            Transform Your Learning with{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Artificial Intelligence
            </span>
          </h1>
          
          <p className="mb-8 text-xl text-muted-foreground">
            Upload your study materials, chat with an intelligent AI assistant, and generate personalized quizzes and flashcards instantly.
          </p>

          {/* Input Field */}
          <div className="mx-auto max-w-2xl mb-12">
            <div className="flex gap-2 rounded-xl border-2 border-primary/20 bg-card p-3 shadow-2xl hover:border-primary/40 transition-all hover:shadow-primary/10">
              <Input
                type="text"
                placeholder="What would you like to study today? (e.g., Quantum Physics, Spanish Verbs...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
                className="border-0 bg-transparent text-base h-14 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button onClick={handleQuickStart} size="lg" className="px-8 h-14">
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No credit card required • Free to get started
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mx-auto max-w-2xl">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Active Learners</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Quizzes Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-lg text-muted-foreground">
            Powered by advanced AI to make learning efficient and engaging
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BookOpen className="h-10 w-10" />}
            title="Smart Source Management"
            description="Upload PDFs, documents, or paste text. Our AI processes and organizes your study materials automatically."
          />
          <FeatureCard
            icon={<MessageSquare className="h-10 w-10" />}
            title="AI Chat Assistant"
            description="Ask questions about your materials and get instant, context-aware answers powered by advanced AI."
          />
          <FeatureCard
            icon={<Target className="h-10 w-10" />}
            title="Personalized Quizzes"
            description="Generate custom quizzes based on your sources with adjustable difficulty and question types."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10" />}
            title="Smart Flashcards"
            description="Create AI-generated flashcards for efficient memorization and spaced repetition learning."
          />
          <FeatureCard
            icon={<TrendingUp className="h-10 w-10" />}
            title="Progress Tracking"
            description="Monitor your learning journey with detailed analytics and performance insights."
          />
          <FeatureCard
            icon={<Sparkles className="h-10 w-10" />}
            title="Adaptive Learning"
            description="AI adjusts to your pace and style, ensuring optimal knowledge retention."
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Learners Love Nexon AI
              </h2>
              <div className="space-y-4">
                <BenefitItem text="Save hours of study time with AI-powered summaries" />
                <BenefitItem text="Improve retention rates by up to 40% with smart quizzes" />
                <BenefitItem text="Study anywhere, anytime with cloud-based access" />
                <BenefitItem text="Get instant feedback and explanations" />
                <BenefitItem text="Track progress and identify weak areas" />
              </div>
              <Button size="lg" className="mt-8" onClick={handleGetStarted}>
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="rounded-2xl border bg-card p-8 shadow-xl">
              <div className="space-y-6">
                <Testimonial
                  quote="Nexon AI helped me ace my finals. The AI-generated quizzes were spot-on!"
                  author="Sarah M."
                  role="Medical Student"
                />
                <Testimonial
                  quote="I cut my study time in half while actually understanding the material better."
                  author="James K."
                  role="Computer Science Major"
                />
                <Testimonial
                  quote="The AI chat feature is like having a personal tutor available 24/7."
                  author="Emily R."
                  role="Law Student"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students who are already learning smarter with Nexon AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-base px-8">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-base px-8">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/nexon-logo.svg"
              alt="Nexon AI logo"
              className="h-6 w-6"
            />
            <span className="font-semibold text-foreground">Nexon AI</span>
          </div>
          <p>&copy; 2025 Nexon AI. All rights reserved. Built with ❤️ for students.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="mb-4 text-primary">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const BenefitItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3">
    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
    <span className="text-lg">{text}</span>
  </div>
);

const Testimonial = ({ quote, author, role }: { quote: string; author: string; role: string }) => (
  <div className="space-y-2">
    <p className="text-muted-foreground italic">"{quote}"</p>
    <div className="text-sm">
      <span className="font-semibold">{author}</span>
      <span className="text-muted-foreground"> • {role}</span>
    </div>
  </div>
);

export default Index;
