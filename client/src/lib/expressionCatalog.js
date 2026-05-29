/** Shared with surface-atoms scheme (govaluate). Operators: + - * / % ^ */

export const RATE_VARIABLES = [
  { name: 'F_density', desc: 'плотность F-центров [см⁻²]' },
  { name: 'S_density', desc: 'плотность S-центров' },
  { name: 'T', desc: 'температура стенки Tw, K' },
  { name: 'atomFlux', desc: 'поток атомов Φ на поверхность' },
  { name: 'Edes', desc: 'Ed — энергия активации десорбции' },
  { name: 'Edif', desc: 'энергия активации диффузии' },
  { name: 'Vdes', desc: 'νd — частотный фактор десорбции' },
  { name: 'Vdif', desc: 'νD — частотный фактор диффузии' },
  { name: 'Er', desc: 'ER — барьер Eley–Rideal' },
  { name: 'Erlh', desc: 'барьер Langmuir–Hinshelwood' },
  { name: 'R', desc: 'газовая постоянная (8.31), как в Marinov: Er/(R·T)' },
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
  { name: 'R', desc: '8.31 — в формулах Arrhenius' },
  ...['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'].map((name) => ({
    name,
    desc: 'скорость ri из rates',
  })),
];

/** Primary toolbar functions */
export const FUNCTIONS_PRIMARY = [
  { name: 'exp', insert: 'exp()', cursorOffset: -1, desc: 'e^x, Arrhenius' },
  { name: 'ln', insert: 'ln()', cursorOffset: -1, desc: 'натуральный лог' },
  { name: 'log', insert: 'log()', cursorOffset: -1, desc: 'натуральный лог' },
  { name: 'sqrt', insert: 'sqrt()', cursorOffset: -1, desc: 'корень, напр. дифф. длина' },
  { name: 'pow', insert: 'pow(, )', cursorOffset: -3, desc: 'pow(x, y)' },
];

/** More functions (overflow row) */
export const FUNCTIONS_EXTRA = [
  { name: 'abs', insert: 'abs()', cursorOffset: -1, desc: 'модуль' },
  { name: 'min', insert: 'min(, )', cursorOffset: -3, desc: 'минимум из двух' },
  { name: 'max', insert: 'max(, )', cursorOffset: -3, desc: 'максимум из двух' },
  { name: 'log10', insert: 'log10()', cursorOffset: -1, desc: 'логарифм по основанию 10' },
  { name: 'exp10', insert: 'exp10()', cursorOffset: -1, desc: '10^x' },
  { name: 'pi', insert: 'pi()', cursorOffset: 0, desc: 'π' },
];

export const FUNCTIONS = [...FUNCTIONS_PRIMARY, ...FUNCTIONS_EXTRA];

export const CONSTANTS = [
  { name: 'R', insert: 'R', cursorOffset: 0, desc: '8.31 — газовая постоянная (Marinov)' },
  { name: 'pi()', insert: 'pi()', cursorOffset: 0, desc: '3.14159…' },
];

export const OPERATORS = [
  { label: '+', insert: ' + ' },
  { label: '−', insert: ' - ' },
  { label: '×', insert: ' * ' },
  { label: '÷', insert: ' / ' },
  { label: '^', insert: ' ^ ', desc: 'степень (govaluate)' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
];

/** Snippets from Kim–Boudart / Marinov / report Table 2 */
export const SNIPPETS = {
  rate: [
    { label: 'r1 ads F', insert: 'atomFlux / (F_density + S_density)' },
    { label: 'r3 ads S', insert: 'atomFlux / (F_density + S_density)' },
    { label: 'Desorption r2', insert: 'Vdes * exp(-Edes / (R * T))' },
    { label: 'Diffusion r5', insert: 'Vdif * exp(-Edif / (R * T))' },
    { label: 'E-R r4', insert: 'exp(-Er / (R * T)) * r3' },
    { label: 'τd⁻¹', insert: 'Vdif * exp(-Edif / (R * T))' },
    { label: 'Arrhenius', insert: 'exp(-Edes / (8.31 * T))' },
  ],
  probability: [
    { label: 'PER (E-R)', insert: 'exp(-Er / (R * T))' },
    { label: 'PLH (L-H)', insert: 'exp(-Erlh / (R * T))' },
    { label: 'γ E-R', insert: '2 * exp(-Er / (R * T))' },
    { label: 'kR·exp', insert: 'exp(-Er / (8.31 * T))' },
  ],
  lambda: [
    { label: 'Ads F', insert: 'free_F_sites * r1' },
    { label: 'Ads S', insert: 'free_S_sites * r3' },
    { label: 'Des F', insert: 'atoms_on_F * r2' },
    { label: 'Recomb ER', insert: 'atoms_on_S * r4' },
    { label: 'Diffusion', insert: 'atoms_on_F * r5' },
  ],
};

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
  const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const pos = selectionStart + insert.length + cursorOffset;
  return { value: next, selectionStart: pos, selectionEnd: pos };
}
