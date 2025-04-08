
import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthContext } from '../context/AuthContext';

const Index = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Talk Now Connect
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8">
          Real-time messaging platform for seamless communication
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-white text-indigo-600 hover:bg-white/90"
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/register')}
            className="bg-transparent border-white text-white hover:bg-white/10"
          >
            Create Account
          </Button>
        </div>
      </div>
      <div className="mt-16 text-white/70 text-sm">
        © {new Date().getFullYear()} Talk Now Connect. All rights reserved.
      </div>
    </div>
  );
};

export default Index;
