// A interface recebe a aplicação pronta pela raiz (main.tsx); nenhum componente cria infraestrutura.
import { createContext, useContext } from 'react';
import type { RazaoApp } from '@/application/app';

export const AppContext = createContext<RazaoApp | null>(null);

export function useRazao(): RazaoApp {
  const app = useContext(AppContext);
  if (!app) throw new Error('AppContext ausente: a raiz precisa montar a aplicação.');
  return app;
}
