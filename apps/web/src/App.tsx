import { Toaster } from 'sonner';  // 👈 ADD THIS
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './providers/QueryProvider';
import { AppRoutes } from './routes';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;