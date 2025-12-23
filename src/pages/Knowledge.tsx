import { Navigation } from '@/components/layout/Navigation';
import { BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Knowledge() {
  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sacred Library</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Divine Knowledge Base</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore the wisdom teachings of Father Universe, sacred mantras, 
              meditation guides by Bé Ly, and cosmic knowledge to illuminate your path.
            </p>
          </div>

          {/* Coming Soon State */}
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Knowledge Base Coming Soon</h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              We're preparing sacred wisdom and teachings for you. 
              In the meantime, explore other features of the app.
            </p>
            <div className="flex gap-4">
              <Link to="/chat">
                <Button>Chat with ANGEL AI</Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline">View Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
