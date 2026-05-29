/** Shared with surface-atoms scheme.Eval / EvalLambdaExpr */

export const RATE_VARIABLES = [
  { name: 'F_density', desc: 'концентрация F-центров (config consts)' },
  { name: 'S_density', desc: 'концентрация S-центров' },
  { name: 'T', desc: 'температура, K' },
  { name: 'atomFlux', desc: 'поток атомов на поверхность' },
  { name: 'Edes', desc: 'энергия десорбции, элемента' },
  { name: 'Edif', desc: 'энергия диффузии' },
  { name: 'Vdes', desc: 'частотный фактор десорбции' },
  { name: 'Vdif', desc: 'частотный фактор диффузии' },
  { name: 'Er', desc: 'барьер E-R' },
  { name: 'Erlh', desc: 'барьер L-H' },
];

export const LAMBDA_VARIABLES = [
  { name: 'free_F_sites', desc: 'число свободных F-ячеек' },
  { name: 'free_S_sites', desc: 'число свободных S-ячеек' },
  { name: 'atoms_on_F', desc: 'атомы элемента на F' },
  { name: 'atoms_on_S', desc: 'атомы элемента на S' },
  { name: 'F_density', desc: 'концентрация F' },
  { name: 'S_density', desc: 'концентрация S' },
  { name: 'atomFlux', desc: 'поток атомов' },
  { name: 'T', desc: 'температура, K' },
  ...['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'].map((name) => ({
    name,
    desc: 'скорость из rates',
  })),
];

export const FUNCTIONS = [
  { name: 'exp', insert: 'exp()', cursorOffset: -1, desc: 'экспонента' },
  { name: 'log', insert: 'log()', cursorOffset: -1, desc: 'натуральный логарифм' },
];

export const OPERATORS = [
  { label: '+', insert: ' + ' },
  { label: '−', insert: ' - ' },
  { label: '×', insert: ' * ' },
  { label: '÷', insert: ' / ' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
];

export const SNIPPETS = {
  rate: [
    { label: 'r ∝ flux / density', insert: 'atomFlux / (F_density + S_density)' },
    { label: 'Desorption', insert: 'Vdes * exp(-Edes / (8.31 * T))' },
    { label: 'E-R × r3', insert: 'exp(-Er / (8.31 * T)) * r3' },
    { label: 'Diffusion rate', insert: 'Vdif * exp(-Edif / (8.31 * T))' },
  ],
  probability: [
    { label: 'E-R on S', insert: 'exp(-Er / (8.31 * T))' },
    { label: 'L-H on F', insert: 'exp(-Erlh / (8.31 * T))' },
  ],
  lambda: [
    { label: 'Ads F', insert: 'free_F_sites * r1' },
    { label: 'Ads S', insert: 'free_S_sites * r3' },
    { label: 'Des F', insert: 'atoms_on_F * r2' },
    { label: 'Recomb ER', insert: 'atoms_on_S * r4' },
    { label: 'Diffusion', insert: 'atoms_on_F * r5' },
  ],
};

/**
 * @param {'rate'|'probability'|'lambda'} context
 * @param {string[]} rateIds - ids from scheme.rates (r1, r2, …)
 */
export function getCompletionItems(context, rateIds = []) {
  const vars =
    context === 'lambda'
      ? LAMBDA_VARIABLES.map((v) => ({ ...v }))
      : RATE_VARIABLES.map((v) => ({ ...v }));

  rateIds.forEach((id) => {
    if (!vars.some((v) => v.name === id)) {
      vars.push({
        name: id,
        desc: context === 'lambda' ? 'скорость из rates' : 'ранее вычисленная скорость',
      });
    }
  });

  const funcs = FUNCTIONS.map((f) => ({
    name: f.name,
    insert: f.insert,
    cursorOffset: f.cursorOffset,
    desc: f.desc,
    kind: 'function',
  }));

  const variables = vars.map((v) => ({
    name: v.name,
    insert: v.name,
    cursorOffset: 0,
    desc: v.desc,
    kind: 'variable',
  }));

  return [...funcs, ...variables];
}

export function getWordBeforeCursor(text, cursor) {
  const before = text.slice(0, cursor);
  const m = before.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
  return m ? m[0] : '';
}

export function applyTextEdit(value, selectionStart, selectionEnd, insert, cursorOffset = 0) {
  const next =
    value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const pos = selectionStart + insert.length + cursorOffset;
  return { value: next, selectionStart: pos, selectionEnd: pos };
}
