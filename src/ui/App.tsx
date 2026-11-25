import styles from './App.module.css';

// Tela provisória da Alpha 1: diz com honestidade que o app ainda não guarda dados.
// Ela é substituída pelo desbloqueio e pelo onboarding no incremento I-05.
export function App() {
  return (
    <main className={styles['tela']}>
      <section className={styles['cartao']} aria-labelledby="titulo">
        <img className={styles['logo']} src="/favicon.png" alt="" width={56} height={56} />
        <h1 id="titulo" className={styles['titulo']}>
          O Razão
        </h1>
        <p className={styles['slogan']}>Suas finanças. Com lógica.</p>
        <p className={styles['aviso']}>Versão em construção (Alpha 1). Ainda não guarda nenhum dado.</p>
      </section>
    </main>
  );
}
