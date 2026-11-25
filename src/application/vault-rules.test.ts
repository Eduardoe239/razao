import { describe, expect, it } from 'vitest';
import { checkPassword, isSafariOutsideApp, lockDue, looksLikeIos, waitAfterFailures } from './vault-rules';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; 23113RKC6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1';

describe('regras do cofre na interface', () => {
  it('[PERS-03] Safari no iPhone e no Mac fora do modo app recebe a explicação; instalado, não', () => {
    expect(isSafariOutsideApp(IPHONE, false)).toBe(true);
    expect(isSafariOutsideApp(CHROME_IOS, false)).toBe(true);
    expect(isSafariOutsideApp(MAC_SAFARI, false)).toBe(true);
    expect(isSafariOutsideApp(IPHONE, true)).toBe(false);
    expect(isSafariOutsideApp(MAC_CHROME, false)).toBe(false);
    expect(isSafariOutsideApp(ANDROID, false)).toBe(false);
  });

  it('[PERS-03] iPad que se apresenta como Mac é reconhecido pelo toque', () => {
    expect(looksLikeIos(MAC_SAFARI, 5)).toBe(true);
    expect(looksLikeIos(MAC_SAFARI, 0)).toBe(false);
    expect(looksLikeIos(IPHONE, 0)).toBe(true);
  });

  it('[COF-001] senha curta ou repetitiva é recusada; frase longa é a mais forte', () => {
    expect(checkPassword('').ok).toBe(false);
    expect(checkPassword('abc1234').ok).toBe(false);
    expect(checkPassword('aaaaaaaaaaaa').ok).toBe(false);
    expect(checkPassword('casaazul').score).toBe(2);
    expect(checkPassword('Casa azul 19').score).toBe(4);
    expect(checkPassword('minha casa azul de 1987').score).toBe(4);
    expect(checkPassword('casaazulverde').score).toBe(3);
    expect(checkPassword('Casaazul1').score).toBe(3);
  });

  it('[SEC-11] espera só a partir da 5ª falha', () => {
    expect(waitAfterFailures(4)).toBe(0);
    expect(waitAfterFailures(5)).toBe(30_000);
    expect(waitAfterFailures(20)).toBe(900_000);
  });

  it('[COF-002] bloqueia por inatividade, por aba oculta e na dúvida', () => {
    expect(lockDue(0, null, 4 * 60_000)).toBe(false);
    expect(lockDue(0, null, 5 * 60_000)).toBe(true);
    expect(lockDue(0, 1000, 1000 + 5 * 60_000, 30)).toBe(true);
    expect(lockDue(10_000, null, 0)).toBe(true);
    expect(lockDue(0, null, 1000, 0)).toBe(true);
  });
});
