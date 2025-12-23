import { Link } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Settings } from 'lucide-react';

export default function KnowledgeAdmin() {
  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/knowledge" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Knowledge Base
            </Link>
            <h1 className="text-3xl font-bold">Knowledge Admin</h1>
            <p className="text-muted-foreground">Manage topics, categories, and content</p>
          </div>

          {/* Coming Soon State */}
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-xl border border-border/50">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Settings className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Admin Panel Coming Soon</h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              The knowledge base management system is being set up. 
              You'll be able to create and manage topics, categories, and content soon.
            </p>
            <Link to="/knowledge">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Knowledge Base
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
