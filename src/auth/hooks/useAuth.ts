import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../context/auth-context';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
