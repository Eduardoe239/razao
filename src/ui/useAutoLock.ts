// COF-002: bloqueio automático por inatividade e por aba oculta. Relógio monotônico; na dúvida, bloqueia.
import { useEffect, useRef } from 'react';
import { lockDue } from '@/application/vault-rules';
import { useRazao } from './context';

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function useAutoLock(active: boolean, onLock: () => void): void {
  const { clock } = useRazao();
  const quem = useRef(onLock);
  useEffect(() => {
    quem.current = onLock;
  }, [onLock]);

  useEffect(() => {
    if (!active) return;
    let ultima = clock.monotonicMs();
    let oculta: number | null = document.hidden ? clock.monotonicMs() : null;
    const atividade = () => {
      ultima = clock.monotonicMs();
    };
    const conferir = () => {
      if (lockDue(ultima, oculta, clock.monotonicMs())) quem.current();
    };
    const visibilidade = () => {
      if (document.hidden) oculta = clock.monotonicMs();
      else {
        conferir();
        oculta = null;
        atividade();
      }
    };
    for (const e of EVENTOS) window.addEventListener(e, atividade, { passive: true });
    document.addEventListener('visibilitychange', visibilidade);
    const timer = window.setInterval(conferir, 10_000);
    return () => {
      for (const e of EVENTOS) window.removeEventListener(e, atividade);
      document.removeEventListener('visibilitychange', visibilidade);
      window.clearInterval(timer);
    };
  }, [active, clock]);
}
