/*
 * Sonda das habilidades de ARMA: elas existem, chegam ao cinto e disparam?
 *
 *   npm run armas
 *
 * O RELATO QUE CRIOU ESTA SONDA: "as skills de arma nao aparecem quando se
 * muda pro modo arma e nao sei se funcionam".
 *
 * Sao tres perguntas diferentes e vale separar, porque as respostas sao
 * diferentes:
 *
 *   1. DA PARA APRENDER? A arvore libera as tres?
 *   2. DA PARA EQUIPAR? Elas entram no cinto da ARMA, e nao no da picareta?
 *   3. APARECEM E FUNCIONAM? Trocar de mao troca o cinto que o pad mostra, e
 *      o efeito chega na bala?
 *
 * A cadeia inteira e de dado e estado — nada de canvas — entao da para
 * percorrer ela aqui, sem abrir o jogo.
 */
import { Attributes } from '../src/systems/Attributes';
import { SkillTree } from '../src/systems/SkillTree';
import { ActiveSkills } from '../src/systems/ActiveSkills';
import { ACTIVE_SKILLS, activeSkillMeta } from '../src/data/activeSkills';
import { SKILLS } from '../src/data/skills';

let falhas = 0;
const ok = (cond: boolean, titulo: string, detalhe = ''): boolean => {
  if (cond) console.log(`  ok   ${titulo}`);
  else {
    falhas++;
    console.log(`  FALHA ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  }
  return cond;
};

const DE_ARMA = ACTIVE_SKILLS.filter((m) => m.hand === 'arma');

console.log('\n1. A ARVORE LIBERA AS TRES?');
const attrs = new Attributes();
const tree = new SkillTree(attrs);
tree.addPoints(200, 'sonda');

for (const m of DE_ARMA) {
  const node = SKILLS.find((s) => s.id === m.skill);
  if (!ok(node !== undefined, `${m.name}: o no "${m.skill}" existe na arvore`)) continue;

  /*
   * Aprende a CADEIA inteira de pre-requisitos, e nao so o no final.
   *
   * Sem isto a sonda diria "nao da para aprender Perfurante" quando o que
   * falta e o no anterior — e eu iria consertar a coisa errada.
   */
  const fila: string[] = [];
  const empilhar = (id: string): void => {
    const n = SKILLS.find((s) => s.id === id);
    if (!n || fila.includes(id)) return;
    for (const r of n.requiredSkills) empilhar(r);
    fila.push(id);
  };
  empilhar(m.skill);

  let aprendeu = true;
  for (const id of fila) {
    // Profundidade generosa: aqui se mede a ARVORE, nao a progressao.
    if (!tree.learn(id, 5000)) {
      const check = tree.canLearn(id, 5000);
      aprendeu = false;
      ok(false, `${m.name}: nao consegui aprender "${id}"`, check.reason ?? 'sem motivo dado');
      break;
    }
  }
  if (!aprendeu) continue;
  ok(true, `${m.name}: aprendida (cadeia de ${fila.length} no(s))`);
}

console.log('\n2. APRENDER JA COLOCA NO CINTO?');
/*
 * A OUTRA METADE DA CAUSA.
 *
 * A habilidade nascia liberada e DESEQUIPADA. O jogador pagava, o cartao dizia
 * PRONTA, e no jogo nao havia botao nenhum — porque aprender e equipar eram
 * dois passos e o segundo nao estava escrito em lugar nenhum. Com as de arma
 * ficava pior: so apareceriam depois de trocar de mao.
 */
const active = new ActiveSkills(attrs);
{
  const entraram = active.autoEquiparLiberadas();
  for (const m of DE_ARMA) {
    ok(
      entraram.includes(m.id),
      `${m.name}: entrou no cinto sozinha ao ser aprendida`,
      'aprendida e desequipada, o jogador nao ve botao nenhum'
    );
  }
  /* So preenche VAGA: com o cinto cheio a escolha volta a ser do jogador,
   * porque trocar uma habilidade por outra e uma decisao. */
  const cheio = active.cintoDe('arma').every((x) => x !== null);
  ok(cheio, 'o cinto da arma ficou cheio com as tres');
  ok(active.autoEquiparLiberadas().length === 0, 'com o cinto cheio, nao troca nada sozinho');
}

console.log('\n3. ELAS FICAM NO CINTO DA ARMA, E SO NELE?');
for (const m of DE_ARMA) {
  const st = active.state(m.id);
  if (!ok(st.unlocked, `${m.name}: aparece como liberada depois da arvore`, `flag ${m.flag}`)) continue;

  const naArma = active.cintoDe('arma').includes(m.id);
  const naPicareta = active.cintoDe('picareta').includes(m.id);
  ok(naArma, `${m.name}: foi para o cinto da ARMA`);
  ok(!naPicareta, `${m.name}: NAO foi parar no cinto da picareta`);
}

console.log('\n4. TROCAR DE MAO TROCA O QUE O PAD MOSTRA?');
{
  active.mao = 'picareta';
  const naPicareta = active.equipped.filter(Boolean);
  active.mao = 'arma';
  const naArma = active.equipped.filter(Boolean);

  ok(
    naArma.length === DE_ARMA.length,
    `no modo arma o cinto mostra as ${DE_ARMA.length} habilidades de arma`,
    `mostrou ${naArma.length}: ${naArma.join(', ') || '(vazio)'}`
  );
  ok(
    !naArma.some((id) => activeSkillMeta(id as never).hand === 'picareta'),
    'nenhuma habilidade de picareta vaza para o cinto da arma'
  );
  ok(
    naPicareta.length === 0 || !naPicareta.some((id) => activeSkillMeta(id as never).hand === 'arma'),
    'nenhuma habilidade de arma vaza para o cinto da picareta'
  );
}

console.log('\n5. DA PARA ACIONAR, E O EFEITO TEM NUMERO?');
/*
 * "Nao sei se funcionam" tambem quer dizer: aciona e sai alguma coisa? Aqui a
 * pergunta e respondida pelo estado — carga disponivel, ativa depois de
 * acionar — e pelos atributos que o Game le para montar a bala.
 */
{
  const efeitos: Record<string, string> = {
    rajada: 'burstShots',
    perfurante: 'pierceCount',
    ricochete: 'ricochetBounces',
  };
  for (const m of DE_ARMA) {
    const antes = active.state(m.id);
    ok(antes.charges > 0 || active.canActivate(m.id), `${m.name}: pode ser acionada`, `cargas ${antes.charges}`);
    active.activate(m.id);
    const depois = active.state(m.id);
    ok(
      depois.charges > 0 || depois.casting > 0 || active.isActive(m.id),
      `${m.name}: acionar deixa ela ativa (carga ou canalizacao)`,
      `cargas ${depois.charges}, casting ${depois.casting}`
    );
    const attr = efeitos[m.id];
    const valor = attrs.get(attr as never);
    ok(valor >= 1, `${m.name}: o efeito tem numero (${attr} = ${valor})`, 'zero significa tiro normal');
  }
}

console.log(falhas === 0 ? '\nas habilidades de arma estao inteiras.\n' : `\n${falhas} falha(s).\n`);
process.exit(falhas > 0 ? 1 : 0);
