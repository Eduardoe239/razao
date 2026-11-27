// Conteúdo de cada etapa do primeiro acesso (Volume 02, seção 4; tela aprovada "Primeiro acesso").
// Só apresentação: o estado e as gravações ficam no Onboarding.
import type { AccountKind, Workspace } from '@/application/model';
import { ACCOUNT_KIND_LABELS } from '@/application/model';
import { checkPassword } from '@/application/vault-rules';
import { CodeBox } from '../components/CodeBox';
import { Icon } from '../components/Icon';
import { Alert, CheckCard, ChoiceCard, MoneyField, StrengthMeter, TextField } from '../components/ds';

export function Welcome() {
  return (
    <>
      <img className="rz-logo" src="/favicon.png" alt="O Razão" width={64} height={64} />
      <h1 className="rz-ob-hero">Suas finanças pessoais e do negócio, cada uma no seu lugar.</h1>
      <p className="rz-ob-lead">
        Seus dados ficam só neste aparelho, protegidos por uma senha que só você sabe.
      </p>
      <ul className="rz-points">
        <li>
          <Icon name="lock" size={22} />
          <span>
            <strong>Fica neste aparelho.</strong> Criptografado, sem conta na nuvem.
          </span>
        </li>
        <li>
          <Icon name="split" size={22} />
          <span>
            <strong>Pessoal e empresa separados.</strong> Cada espaço com as suas contas.
          </span>
        </li>
        <li>
          <Icon name="chat" size={22} />
          <span>
            <strong>Razão IA explica seus números.</strong> E nunca move dinheiro.
          </span>
        </li>
      </ul>
    </>
  );
}

/** PERS-03: no Safari fora do modo app, explicar por que e como instalar antes de criar o cofre. */
export function SafariNotice({ ios }: { ios: boolean }) {
  return (
    <>
      <div className="rz-ob-intro">
        <h1 className="rz-ob-title">Instale o Razão antes de começar</h1>
        <p className="rz-ob-lead">
          No Safari, o navegador pode apagar os dados de um site que fica alguns dias sem uso. Instalado como
          app, o Razão fica fora dessa regra e seus dados ficam mais protegidos.
        </p>
      </div>
      {ios ? (
        <ol className="rz-steps">
          <li>
            Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima).
          </li>
          <li>
            Escolha <strong>Adicionar à Tela de Início</strong>.
          </li>
          <li>Abra o Razão pelo ícone novo e comece por lá.</li>
        </ol>
      ) : (
        <ol className="rz-steps">
          <li>
            No menu <strong>Arquivo</strong>, escolha <strong>Adicionar ao Dock</strong>.
          </li>
          <li>Abra o Razão pelo ícone novo e comece por lá.</li>
        </ol>
      )}
      <Alert tone="info" title="Pode seguir sem instalar">
        Se preferir, continue aqui mesmo. Nesse caso, faça backups com frequência.
      </Alert>
    </>
  );
}

export function PasswordStep(p: {
  senha: string;
  repeticao: string;
  erro: string | undefined;
  onSenha: (v: string) => void;
  onRepeticao: (v: string) => void;
}) {
  const forca = checkPassword(p.senha);
  const diferentes = p.repeticao.length > 0 && p.repeticao !== p.senha;
  return (
    <>
      <div className="rz-ob-intro">
        <h1 className="rz-ob-title">Crie a senha do cofre</h1>
        <p className="rz-ob-lead">Ela abre seus dados neste aparelho. Use uma frase que só você saiba.</p>
      </div>
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        autoFocus
        value={p.senha}
        onChange={p.onSenha}
        maxLength={256}
        help={forca.message}
        below={<StrengthMeter score={forca.score} />}
      />
      <TextField
        label="Repita a senha"
        type="password"
        autoComplete="new-password"
        value={p.repeticao}
        onChange={p.onRepeticao}
        maxLength={256}
        error={diferentes ? 'As duas senhas não são iguais.' : p.erro}
      />
      <Alert tone="warning" title="Ninguém consegue recuperar esta senha">
        Nem o Razão. Na próxima etapa você recebe um código de recuperação.
      </Alert>
    </>
  );
}

export function CodeStep({
  code,
  guardou,
  onGuardou,
}: {
  code: string;
  guardou: boolean;
  onGuardou: () => void;
}) {
  return (
    <>
      <div className="rz-ob-intro">
        <h1 className="rz-ob-title">Guarde o código de recuperação</h1>
        <p className="rz-ob-lead">
          Se esquecer a senha, só este código abre o cofre. Guarde fora deste aparelho.
        </p>
      </div>
      <CodeBox code={code} />
      <CheckCard checked={guardou} onToggle={onGuardou}>
        Guardei o código em um lugar seguro
      </CheckCard>
    </>
  );
}

export function SpacesStep(p: {
  comEmpresa: boolean;
  onModo: (comEmpresa: boolean) => void;
  empresa: string;
  onEmpresa: (v: string) => void;
  erro: string | undefined;
}) {
  return (
    <>
      <div className="rz-ob-intro">
        <h1 className="rz-ob-title">O que você vai organizar?</h1>
        <p className="rz-ob-lead">Cada espaço tem as suas contas. Nada de um aparece no outro.</p>
      </div>
      <div role="radiogroup" aria-label="Espaços" className="rz-ob-intro">
        <ChoiceCard
          checked={!p.comEmpresa}
          onSelect={() => {
            p.onModo(false);
          }}
          title="Só as finanças pessoais"
          text="Contas, cartões, orçamento e previsão."
        />
        <ChoiceCard
          checked={p.comEmpresa}
          onSelect={() => {
            p.onModo(true);
          }}
          title="Pessoal e minha empresa"
          text="Dois espaços separados: Pessoal (PF) e Negócio (PJ)."
        />
      </div>
      {p.comEmpresa ? (
        <div className="rz-enter">
          <TextField
            label="Nome da empresa"
            value={p.empresa}
            onChange={p.onEmpresa}
            maxLength={80}
            autoFocus
            error={p.erro}
          />
        </div>
      ) : null}
    </>
  );
}

const TIPOS: readonly AccountKind[] = [
  'corrente',
  'digital',
  'poupanca',
  'carteira',
  'dinheiro',
  'investimento',
];

export function AccountStep(p: {
  workspaces: readonly Workspace[];
  alvo: string;
  onAlvo: (id: string) => void;
  nome: string;
  onNome: (v: string) => void;
  tipo: AccountKind;
  onTipo: (k: AccountKind) => void;
  saldo: string;
  onSaldo: (v: string) => void;
  erros: { nome?: string | undefined; saldo?: string | undefined };
}) {
  return (
    <>
      <div className="rz-ob-intro">
        <h1 className="rz-ob-title">Adicione sua primeira conta</h1>
        <p className="rz-ob-lead">O saldo de hoje é o ponto de partida. O resto você completa depois.</p>
      </div>
      {p.workspaces.length > 1 ? (
        <fieldset className="rz-fieldset">
          <legend className="rz-label">Espaço da conta</legend>
          <div role="radiogroup" aria-label="Espaço da conta" className="rz-chips">
            {p.workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={p.alvo === w.id}
                className="rz-chip"
                onClick={() => {
                  p.onAlvo(w.id);
                }}
              >
                {w.kind === 'PF' ? 'Pessoal' : w.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <TextField
        label="Nome da conta"
        placeholder="Ex.: Banco, conta corrente"
        value={p.nome}
        onChange={p.onNome}
        maxLength={60}
        error={p.erros.nome}
      />
      <fieldset className="rz-fieldset">
        <legend className="rz-label">Tipo</legend>
        <div role="radiogroup" aria-label="Tipo da conta" className="rz-chips">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={p.tipo === t}
              className="rz-chip"
              onClick={() => {
                p.onTipo(t);
              }}
            >
              {ACCOUNT_KIND_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>
      <MoneyField
        label="Saldo de hoje"
        value={p.saldo}
        onChange={p.onSaldo}
        help="Se a conta está no negativo, comece com o sinal de menos."
        error={p.erros.saldo}
      />
    </>
  );
}

export function DoneStep() {
  return (
    <div className="rz-done">
      <div className="rz-done-mark">
        <Icon name="check" size={30} />
      </div>
      <h1 className="rz-ob-title">Tudo pronto</h1>
      <p className="rz-ob-lead">
        Seu cofre foi criado e a primeira conta está lá. Lembre de fazer backups com frequência.
      </p>
    </div>
  );
}
