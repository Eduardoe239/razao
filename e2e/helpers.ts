// Apoio aos testes ponta a ponta: cria o cofre pelo primeiro acesso, com dados sintéticos.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const SENHA = 'uma frase longa de teste';

export async function criarCofre(page: Page, comEmpresa: boolean) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  // PERS-03: no WebKit fora do modo app aparece a explicação de instalar; dá para seguir.
  const semInstalar = page.getByRole('button', { name: 'Continuar sem instalar' });
  if (await semInstalar.isVisible().catch(() => false)) await semInstalar.click();
  await expect(page.getByRole('heading', { name: 'Crie a senha do cofre' })).toBeVisible();
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByLabel('Repita a senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar cofre' }).click();

  await expect(page.getByRole('heading', { name: 'Guarde o código de recuperação' })).toBeVisible({
    timeout: 20_000,
  });
  const codigo = (await page.getByTestId('codigo').innerText()).replace(/\s+/g, '');
  expect(codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await expect(continuar).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Guardei o código em um lugar seguro' }).click();
  await continuar.click();

  await expect(page.getByRole('heading', { name: 'O que você vai organizar?' })).toBeVisible();
  if (comEmpresa) {
    await page.getByRole('radio', { name: /Pessoal e minha empresa/ }).click();
    await page.getByLabel('Nome da empresa').fill('Norte Software ME');
  }
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Adicione sua primeira conta' })).toBeVisible();
  await page.getByLabel('Nome da conta').fill('Banco Azul');
  await page.getByRole('radio', { name: 'Conta corrente' }).click();
  await page.getByLabel('Saldo de hoje').fill('9.270,35');
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByRole('heading', { name: 'Tudo pronto' })).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o Início' }).click();
  return codigo;
}

/** Faz o put nativo de um conjunto falhar com o erro escolhido, como um navegador sem espaço ou com defeito. */
export async function prepararFalhas(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __falha?: { store: string; nome: string } | null };
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      const f = w.__falha;
      if (f && this.name === f.store) throw new DOMException('falha simulada', f.nome);
      return original.apply(this, args);
    };
  });
}

export async function falhar(page: Page, falha: { store: string; nome: string } | null): Promise<void> {
  await page.evaluate((f) => {
    (window as unknown as { __falha?: unknown }).__falha = f;
  }, falha);
}

/** Vai para Contas ou Espaços. Depois de reabrir o cofre, o app volta à tela onde estava (rota no endereço). */
export async function irPara(page: Page, nome: 'Ver contas' | 'Espaços'): Promise<void> {
  const titulo = nome === 'Ver contas' ? 'Contas e cartões' : 'Espaços';
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  if ((await h1.innerText()) === titulo) return;
  await page.getByRole('button', { name: nome, exact: true }).filter({ visible: true }).first().click();
  await expect(h1).toHaveText(titulo);
}
