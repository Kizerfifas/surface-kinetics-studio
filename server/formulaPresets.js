/**
 * Named formula presets — must stay in sync with surface-atoms/internal/scheme/presets.go
 */

export const RESERVED_MATH_NAMES = new Set([
  'exp', 'log', 'ln', 'log10', 'exp10', 'sqrt', 'abs', 'pow', 'min', 'max', 'pi',
]);

export const BUILTIN_FORMULA_PRESETS = {
  arrhenius: {
    params: ['V', 'E'],
    expr: 'V * exp(-E / (R * T))',
    desc: 'Аррениус: ν·exp(−E/(R·T))',
    contexts: ['rate'],
  },
  per: {
    params: ['E'],
    expr: 'exp(-E / (R * T))',
    desc: 'PER / E-R',
    contexts: ['rate', 'probability'],
  },
  plh: {
    params: ['E'],
    expr: 'exp(-E / (R * T))',
    desc: 'PLH / L–H',
    contexts: ['rate', 'probability'],
  },
  adsorption_flux: {
    params: [],
    expr: 'atomFlux / (F_density + S_density)',
    desc: 'r1/r3: Φ/(F+S)',
    contexts: ['rate'],
  },
  er_with_r3: {
    params: ['E'],
    expr: 'per(E) * r3',
    desc: 'E-R: PER·r3',
    contexts: ['rate'],
  },
  bkl_sites_rate: {
    params: ['sites', 'rate'],
    expr: 'sites * rate',
    desc: 'λ: сайты × скорость',
    contexts: ['lambda'],
  },
  bkl_atoms_rate: {
    params: ['atoms', 'rate'],
    expr: 'atoms * rate',
    desc: 'λ: атомы × скорость',
    contexts: ['lambda'],
  },
};

export function mergeRegistries(schemeFunctions = {}) {
  return { ...BUILTIN_FORMULA_PRESETS, ...schemeFunctions };
}

export function listPresetsForUI(schemeFunctions = {}, context) {
  const reg = mergeRegistries(schemeFunctions);
  return Object.entries(reg).map(([name, def]) => {
    const args =
      def.params?.length > 0
        ? def.params.join(', ')
        : '';
    const insert = args ? `${name}(${args})` : `${name}()`;
    const contexts = def.contexts || ['rate', 'probability', 'lambda'];
    return {
      name,
      insert,
      cursorOffset: 0,
      desc: def.desc || def.expr,
      contexts,
      params: def.params || [],
      hidden: context && !contexts.includes(context),
    };
  }).filter((p) => !p.hidden);
}

function needsParens(s) {
  return /[+\-*/^ \t]/.test(s.trim());
}

function matchingCloseParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevelArgs(inner) {
  const trimmed = inner.trim();
  if (!trimmed) return [];
  const args = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      args.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  args.push(buf);
  return args.map((a) => a.trim());
}

function isIdentStart(c) {
  return /[a-zA-Z_]/.test(c);
}
function isIdentChar(c) {
  return /[a-zA-Z0-9_]/.test(c);
}

function findNextPresetCall(expr, from, registry) {
  for (let i = from; i < expr.length; i++) {
    if (!isIdentStart(expr[i])) continue;
    let j = i + 1;
    while (j < expr.length && isIdentChar(expr[j])) j++;
    const name = expr.slice(i, j);
    if (RESERVED_MATH_NAMES.has(name) || !registry[name]) continue;
    let k = j;
    while (k < expr.length && /\s/.test(expr[k])) k++;
    if (expr[k] !== '(') continue;
    const closeIdx = matchingCloseParen(expr, k);
    if (closeIdx < 0) continue;
    const args = splitTopLevelArgs(expr.slice(k + 1, closeIdx));
    return { name, start: i, end: closeIdx + 1, args };
  }
  return null;
}

function substituteParams(body, params, args, registry) {
  let out = body;
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    let arg = expandFormula(args[i], registry);
    if (needsParens(arg)) arg = `(${arg})`;
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    if (!re.test(out)) throw new Error(`parameter ${p} not in preset body`);
    out = out.replace(re, arg);
  }
  return expandFormula(out, registry);
}

/** Expand named presets; leaves manual expressions unchanged. */
export function expandFormula(expr, registry) {
  if (!expr?.trim()) throw new Error('empty expression');
  let out = expr;
  for (let iter = 0; iter < 64; iter++) {
    const call = findNextPresetCall(out, 0, registry);
    if (!call) return out;
    const def = registry[call.name];
    if (!def) throw new Error(`unknown preset ${call.name}`);
    const params = def.params || [];
    if (call.args.length !== params.length) {
      throw new Error(
        `preset ${call.name}: expected ${params.length} argument(s), got ${call.args.length}`,
      );
    }
    const body = substituteParams(def.expr, params, call.args, registry);
    out = `${out.slice(0, call.start)}(${body})${out.slice(call.end)}`;
  }
  throw new Error('preset expansion: too many iterations');
}

export function validateSchemeExpressions(scheme) {
  const reg = mergeRegistries(scheme.functions || {});
  for (const r of scheme.rates || []) {
    expandFormula(r.expr, reg);
  }
  for (const p of scheme.probabilities || []) {
    expandFormula(p.expr, reg);
  }
  for (const e of scheme.events || []) {
    if (e.lambda_expr) expandFormula(e.lambda_expr, reg);
  }
}
