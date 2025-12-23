import { Link } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';

export default function KnowledgeTopic() {
  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <Link to="/knowledge" className="inline-block mb-6">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Knowledge
            </Button>
          </Link>

          {/* Coming Soon State */}
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Topic Not Available</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              The knowledge base is being set up. Topics will be available soon.
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
