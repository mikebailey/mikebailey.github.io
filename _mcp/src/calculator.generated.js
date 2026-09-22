// Generated from published Mike Bailey power calculator. Do not edit.
// SHA256 3259936744c092b8e539e12fab6e22a0cefc7b21fe94d1f738954f7c3f2f4e6a
export const sourceHash='3259936744c092b8e539e12fab6e22a0cefc7b21fe94d1f738954f7c3f2f4e6a';
export function calculator(solveFor){
const fmt=n=>n.toLocaleString('en-US');
/* ---------- normal CDF (Hart's rational approximation, |error| ~1e-15) ----------
   The Abramowitz & Stegun form used earlier is only good to 1.5e-7, which is fine for a
   displayed power but not as the target of the quantile refinement below, and not when a
   sample size in the billions scales with the square of a quantile. */
function normCdf(x) {
  const a = Math.abs(x);
  let cum;
  if (a > 37) cum = 0;
  else {
    const e = Math.exp(-a * a / 2);
    if (a < 7.07106781186547) {
      let b = 3.52624965998911e-02 * a + 0.700383064443688;
      b = b * a + 6.37396220353165;   b = b * a + 33.912866078383;
      b = b * a + 112.079291497871;   b = b * a + 221.213596169931;
      b = b * a + 220.206867912376;
      cum = e * b;
      b = 8.83883476483184e-02 * a + 1.75566716318264;
      b = b * a + 16.064177579207;    b = b * a + 86.7807322029461;
      b = b * a + 296.564248779674;   b = b * a + 637.333633378831;
      b = b * a + 793.826512519948;   b = b * a + 440.413735824752;
      cum = cum / b;
    } else {
      let b = a + 0.65;
      b = a + 4 / b; b = a + 3 / b; b = a + 2 / b; b = a + 1 / b;
      cum = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - cum : cum;
}

/* ---------- t distribution ----------
   Cluster-randomised designs are analysed with few degrees of freedom (df ≈ K − 2),
   where the normal approximation overstates power. Regularised incomplete beta gives
   the t CDF; the quantile is recovered by bisection. */
function betacf(a, b, x) {
  const FPMIN = 1e-300; let qab = a+b, qap = a+1, qam = a-1, c = 1, d = 1 - qab*x/qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1/d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2*m;
    let aa = m*(b-m)*x/((qam+m2)*(a+m2));
    d = 1 + aa*d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa/c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1/d; h *= d*c;
    aa = -(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d = 1 + aa*d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa/c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1/d; const del = d*c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function gammaln(x) {
  // Lanczos, g = 671/128 with 14 coefficients (Numerical Recipes 3rd ed). The 6-coefficient
  // form this replaced is accurate to about 1.8e-10 in ABSOLUTE terms, and every use here feeds
  // an exponent — betai and gammaQ both evaluate exp(... - gammaln(...)) — where an absolute
  // error becomes a relative error of the same size. That put a 1e-10 floor under tCdf, and so
  // under invT and every t quantile in the tool. This form holds ~1e-15.
  const cof = [57.1562356658629235, -59.5979603554754912, 14.1360979747417471,
               -0.491913816097620199, 0.339946499848118887e-4, 0.465236289270485756e-4,
               -0.983744753048795646e-4, 0.158088703224912494e-3, -0.210264441724104883e-3,
               0.217439618115212643e-3, -0.164318106536763890e-3, 0.844182239838527433e-4,
               -0.261908384015814087e-4, 0.368991826595316234e-5];
  let y = x, tmp = x + 5.24218750000000000;          // 671/128
  tmp = (x + 0.5)*Math.log(tmp) - tmp;
  let ser = 0.999999999999997092;
  for (let j = 0; j < 14; j++) ser += cof[j]/++y;
  return tmp + Math.log(2.5066282746310005*ser/x);
}
function betai(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a+b) - gammaln(a) - gammaln(b) + a*Math.log(x) + b*Math.log(1-x));
  return x < (a+1)/(a+b+2) ? bt*betacf(a,b,x)/a : 1 - bt*betacf(b,a,1-x)/b;
}
function tCdf(t, df) {
  const p = 0.5 * betai(df/2, 0.5, df/(df + t*t));
  return t > 0 ? 1 - p : p;
}
/* Noncentral t CDF, Lenth (1989) AS 243 — the same algorithm behind R's pt(q, df, ncp) and
   SAS PROC POWER. Power for a two-sample t test is P(T' > crit) with T' noncentral, not the
   central t shifted by the noncentrality, which is what this tool used to compute. The two
   agree to about 0.05 percentage points, worth roughly one participant. */
/* Regularised incomplete gamma, Numerical Recipes gser/gcf. Q(a,x) is the chi-square upper
   tail: P(V > 2x) for V chi-square on 2a df. Only tncCdfTail needs it. */
function gammaQ(a, x) {
  if (!(x >= 0) || !(a > 0)) return NaN;
  if (x === 0) return 1;
  if (x < a + 1) {                                  // series for P, then complement
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n <= 1000; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  // continued fraction for Q, modified Lentz
  const FPMIN = 1e-300;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 1000; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;         if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
}

/* Noncentral t for the range where the AS 243 series underflows (|delta| > 37.5).

   Write T' = (Z + delta)/sqrt(V/df) with Z standard normal and V chi-square on df, both
   independent, and put s = sqrt(V/df). Then, for t > 0,

       P(T' <= t) = P(Z + delta <= t*s) = E_Z[ P(s >= (Z + delta)/t) ]
                  = integral phi(z) * Q(df/2, df*((z+delta)/t)^2 / 2) dz

   There are no Poisson weights, so nothing underflows however large delta gets.

   Integrating over z rather than over s is the point. In s the integrand carries a boundary
   layer of width 1/t around s = delta/t — at t = 1000 that is a step 0.001 wide, which a mesh
   fine enough to resolve would have to be absurd, and Simpson over s duly stalls around 1e-3.
   In z the interesting range is fixed at about +/-9 whatever the parameters, because that is
   where phi lives, and the same 2000-point rule lands within 1e-13 everywhere it was tested. */
function tncCdfTail(t, df, delta) {
  const Z = 9, N = 2000, h = 2 * Z / N;             // N even, for Simpson
  const g = z => {
    const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const x = (z + delta) / t;
    if (!(x > 0)) return phi;                       // P(s >= a negative number) = 1
    return phi * gammaQ(df / 2, df * x * x / 2);
  };
  let sum = g(-Z) + g(Z);
  for (let i = 1; i < N; i++) sum += g(-Z + i * h) * (i % 2 ? 4 : 2);
  return Math.min(1, Math.max(0, sum * h / 3));
}

function tncCdf(t, df, delta) {
  if (!(Math.abs(delta) > 0)) return tCdf(t, df);
  if (!isFinite(delta) || df <= 0) return NaN;
  // Above df ~ 3000 the t is a normal for every purpose here, and the series stops being
  // accurate long before that in double precision: at df = 1e16 it returned 0.66 where the
  // normal limit is 0.16. invT already switches to invNorm at the same threshold, so the
  // quantile and the CDF stay in the same regime.
  if (!isFinite(df) || df > 3000) return normCdf(t - delta);
  // The Poisson weight exp(-delta^2/2) underflows past |delta| ~ 37.5, which leaves the AS 243
  // series with nothing to sum, so that region needs a different representation. It used to
  // fall back to the central t shifted, on the reasoning that "that far from the null the
  // shifted-central form is exact anyway". That is true as df grows and false where it
  // matters: at df ~ 1.8 and delta ~ 37.7 the shifted form returns 0.989 against a true
  // 0.789, overstating power by twenty points — and overstating is the unsafe direction.
  // Reflect FIRST. tncCdfTail is derived for t > 0 — it divides by t, and the inequality it
  // rests on flips sign when t is negative — so it must never be handed a t <= 0. Dispatching
  // to it before this line sent it t = -2.4e-7 (invT's answer for the median, which is exactly
  // zero but comes back a hair below it) and got 1 back where the answer is 0, turning a power
  // of 1 into 2e-25.
  if (t < 0) return 1 - tncCdf(-t, df, -delta);
  if (t === 0) return normCdf(-delta);              // T' <= 0  iff  Z + delta <= 0
  if (Math.abs(delta) > 37.5) return tncCdfTail(t, df, delta);
  const x = t * t / (t * t + df);
  if (!(x > 0)) return normCdf(-delta);
  const lambda = delta * delta;
  let p = 0.5 * Math.exp(-0.5 * lambda);
  let q = Math.sqrt(2 / Math.PI) * p * delta;
  let s = 0.5 - p;                                   // remaining Poisson mass, for the error bound
  let a = 0.5;
  const b = 0.5 * df;
  const rxb = Math.pow(1 - x, b);
  const albeta = gammaln(a) + gammaln(b) - gammaln(a + b);
  let xodd = betai(a, b, x);
  let godd = 2 * rxb * Math.exp(a * Math.log(x) - albeta);
  let xeven = 1 - rxb;
  let geven = b * x * rxb;
  let tnc = p * xodd + q * xeven;
  for (let it = 1; it <= 1000; it++) {
    a += 1;
    xodd  -= godd;
    xeven -= geven;
    godd  *= x * (a + b - 1) / a;
    geven *= x * (a + b - 0.5) / (a + 0.5);
    p *= lambda / (2 * it);
    q *= lambda / (2 * it + 1);
    s -= p;
    tnc += p * xodd + q * xeven;
    if (Math.abs(2 * s * (xodd - godd)) < 1e-13) break;
  }
  return Math.min(1, Math.max(0, tnc + normCdf(-delta)));
}

function invT(p, df) {
  if (!isFinite(df) || df > 3000) return invNorm(p);      // t → z
  if (df <= 0) return NaN;
  // The median is exactly zero, and bisection cannot find it: tCdf reaches t only through t²,
  // so every |t| below about 1e-8 returns the same 0.5 and the search floors out around 2e-7.
  // Harmless as a quantile, but it is a sign, and callers branch on the sign.
  if (p === 0.5) return 0;
  // The bracket has to contain the answer. A fixed ±60 does not: at df = 1 the 99.9th
  // percentile of t is 318, and bisecting [−60, 60] converges silently to its own endpoint.
  // That is not a small error and it points the wrong way — a critical value clamped to 60
  // UNDERSTATES the required sample and OVERSTATES power, so an under-powered design comes
  // back looking adequate rather than raising an error. It bites when df is small (a handful
  // of clusters, or a tiny realised design) and α* is far into the tail (heavy multiplicity
  // correction), which is exactly where a user has least intuition for checking the answer.
  // Widen only when the default bracket does not straddle p, so every design that was already
  // inside it converges to the identical value it did before.
  let lo = -60, hi = 60;
  if (tCdf(hi, df) < p) {
    while (tCdf(hi, df) < p) { lo = hi; hi *= 2; if (hi > 1e300) return Infinity; }
  } else if (tCdf(lo, df) > p) {
    while (tCdf(lo, df) > p) { hi = lo; lo *= 2; if (lo < -1e300) return -Infinity; }
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi)/2;
    if (tCdf(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi)/2;
}
// the quantile pair the design actually uses, given sidedness and (optionally) df
function quantileParts(s, df) {
  const twoSided = s.sided !== 1;
  const alpha = adjustedAlpha(s), pwr = perComparisonPower(s);
  const a = twoSided ? 1 - alpha/2 : 1 - alpha;
  const useT = s.tCorrect !== false && isFinite(df) && df > 0;
  return useT ? { qa: invT(a, df), qb: invT(pwr, df) } : { qa: invNorm(a), qb: invNorm(pwr) };
}
function quantiles(s, df) { const q = quantileParts(s, df); return q.qa + q.qb; }

/* ---------- normal quantile (Acklam's algorithm, |error| < 1.15e-9) ---------- */
function invNormRaw(p) {
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425, ph=1-pl;
  let q,r;
  if (p<pl){ q=Math.sqrt(-2*Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if (p<=ph){ q=p-0.5; r=q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
/* Acklam's rational approximation is good to ~1.15e-9, which is invisible in a sample size of
   a few thousand but shows up as tens of units when n runs to 10^10, because n scales with the
   square of the quantile. Two Halley steps against the exact CDF take it to full precision. */
function invNorm(p) {
  let x = invNormRaw(p);
  if (!isFinite(x)) return x;
  for (let i = 0; i < 2; i++) {
    const e = normCdf(x) - p;
    const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    if (!(pdf > 1e-300)) break;
    const u = e / pdf;
    x = x - u / (1 + x * u / 2);
  }
  return x;
}

/* ---------- shared core ----------
   Everything the design modules have in common: the z terms, the outcome variance,
   the take-up contrast. Returns `unit`, the analysed sample required per unit of
   (z₁₋α/₂ + z_power)², so the same quantity can be used to solve for sample size,
   for MDE, or for power without restating the formula three times. */
/* ---------- multiplicity ----------
   Two separate things get adjusted, and conflating them is a common error:
     α  is split across the tests being corrected (arms × outcomes)
     the power target changes only if the claim is joint ("any" or "all" of them) */
function comparisons(s) { return Math.max(1, (s.arms || 1)) * Math.max(1, (s.outcomes || 1)); }

/* Bonferroni's guarantee comes from testing each of M hypotheses at α/M, and it holds whatever
   the dependence structure. Substituting an "effective" number of tests forfeits that guarantee,
   so the correction is applied to the actual test count and correlation is handled where it
   belongs — in joint power. The correlation-discounted threshold remains available as an
   explicitly experimental option, never as a procedure named after Bonferroni or Šidák. */
function effectiveTests(s) {
  const m = comparisons(s), r = Math.min(Math.max(s.testCorr || 0, 0), 0.99);
  return 1 + (m - 1) * (1 - r);
}

function adjustedAlpha(s) {
  const m = comparisons(s);
  if (m <= 1) return s.alpha;
  switch (s.correction) {
    case 'bonferroni': return s.alpha / m;
    case 'sidak':      return 1 - Math.pow(1 - s.alpha, 1 / m);
    case 'effective':  return s.alpha / effectiveTests(s);   // experimental, not Bonferroni
    default: return s.alpha;
  }
}

/* Joint power over correlated tests. Two things make the comparisons correlated: arms
   share one control group (equal allocation gives r = ½), and multiple outcomes measured
   on the same people move together. Treating them as independent overstates "at least
   one" badly — in simulation, by 14 points at three arms. The tests are represented as
   equicorrelated normals, Z_j = ncp + √r·U + √(1−r)·E_j, which are independent given the
   common factor U, so the joint probability is a one-dimensional integral over U. */
function testCorrelation(s) {
  const rArm = (s.arms || 1) > 1 ? 0.5 : 0;
  const rOut = Math.min(Math.max(s.testCorr || 0, 0), 0.99);
  return 1 - (1 - rArm) * (1 - rOut);
}
function jointFromEach(pEach, s, m, crit) {
  if (m <= 1) return pEach;
  const r = Math.min(Math.max(testCorrelation(s), 0), 0.98);
  const ncp = crit + invNorm(Math.min(Math.max(pEach, 1e-9), 1 - 1e-9));
  const N = 96; let anyMiss = 0, allHit = 0;
  for (let i = 0; i < N; i++) {
    const u = -6 + 12 * (i + 0.5) / N;
    const w = Math.exp(-u*u/2) / Math.sqrt(2*Math.PI) * (12 / N);
    const p = normCdf((ncp + Math.sqrt(r) * u - crit) / Math.sqrt(1 - r));
    anyMiss += w * Math.pow(1 - p, m);
    allHit  += w * Math.pow(p, m);
  }
  return s.powerDef === 'all' ? allHit : 1 - anyMiss;
}

// The power each comparison must reach for the joint claim to hold.
function perComparisonPower(s) {
  const m = comparisons(s);
  if (m <= 1 || !s.powerDef || s.powerDef === 'each') return s.power;
  const crit = invNorm(1 - adjustedAlpha(s) / (s.sided === 1 ? 1 : 2));
  let lo = 1e-6, hi = 1 - 1e-9;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (jointFromEach(mid, s, m, crit) < s.power) lo = mid; else hi = mid;
  }
  return hi;
}

// Allocation: with several arms the sample splits equally across control and each treatment,
// so the variance factor is 1/p_t + 1/p_c = 2(T+1) rather than 1/(P(1−P)).
function allocationFactor(s) {
  const T = Math.max(1, s.arms || 1);
  return T > 1 ? 2 * (T + 1) : 1 / (s.prop * (1 - s.prop));
}

function baseRequirement(mde, s) {
  const takeup = Math.abs(s.tut - s.tuc);
  if (takeup === 0) return { error: 'Take-up is identical in treatment and control — there is no effective treatment contrast to detect.' };
  if (s.attr >= 1) return { error: 'Attrition must be below 100%.' };
  // A non-inferiority test asks whether the effect stays within a margin, so the
  // quantity to detect is the gap between the margin and the difference assumed true.
  const effect = s.ni ? Math.abs(s.niMargin - mde) : mde;
  if (!(effect > 0)) return { error: s.ni
    ? 'The assumed difference equals the non-inferiority margin — no gap is left to detect.'
    : 'The minimum detectable effect must be greater than zero.' };
  // Covariates (typically a baseline measure of the outcome) explain a share R² of the
  // outcome variance; only the residual has to be overcome by sample size.
  const r2 = Math.min(Math.max(s.r2 || 0, 0), 0.99);
  let variance;
  if (s.binary) {
    // The treatment proportion moves with the effect, so the two arms have different
    // variances. The default averages them, as a standard two-proportion calculation does.
    // The legacy method uses the baseline variance for both arms; it is retained for
    // comparability with calculations made under that convention.
    const p1 = s.binaryDir === 'decrease' ? s.p0 - mde : s.p0 + mde;
    if (!(p1 >= 0 && p1 <= 1)) return { error: s.binaryDir === 'decrease'
      ? `A ${(+(mde * 100).toPrecision(3))} point decrease from ${s.p0} would put the treatment proportion at ${(+p1.toPrecision(3))} — below zero. Lower the effect or raise the baseline.`
      : `A ${(+(mde * 100).toPrecision(3))} point increase from ${s.p0} would put the treatment proportion above 1. Lower the effect or the baseline.` };
    // p₁ at exactly 0 or 1 is a real boundary — every treated unit has (or lacks) the
    // outcome — and contributes zero variance from that arm, which is fine as long as the
    // pair is not degenerate.
    variance = s.binaryMethod === 'legacy'
      ? s.p0 * (1 - s.p0)
      : (s.p0 * (1 - s.p0) + p1 * (1 - p1)) / 2;
    if (!(variance > 0)) return { error: 'Both arms would have no variation in the outcome — there is nothing to detect.' };
    variance *= (1 - r2);
  } else {
    variance = s.sd * s.sd * (1 - r2);
  }
  // analysed sample required per unit of (z₁₋α + z_power)² — the shared quantity that
  // lets the same core solve for sample size, MDE, or power
  const A = allocationFactor(s);
  const unit = variance * A / (effect * effect) / (takeup * takeup);

  // Binary, two-proportion: the standard score-test sizing uses the variance pooled under the
  // null for the significance term and the unpooled variance under the alternative for the
  // power term. Those cannot be folded into one quantity multiplied by (q_alpha + q_power)²,
  // so the two quantiles are carried separately here.
  if (s.binary && s.binaryMethod !== 'legacy') {
    const p1 = s.binaryDir === 'decrease' ? s.p0 - mde : s.p0 + mde;
    const P = (s.arms || 1) > 1 ? 0.5 : s.prop;          // arms are equal-sized pairwise
    const scale = (1 - r2) * ((s.arms || 1) > 1 ? (s.arms + 1) / 2 : 1);
    const pbar = P * p1 + (1 - P) * s.p0;
    const c0 = (1 / P + 1 / (1 - P)) * pbar * (1 - pbar) * scale;   // pooled, under H0
    const c1 = (p1 * (1 - p1) / P + s.p0 * (1 - s.p0) / (1 - P)) * scale;   // unpooled, under H1
    const denom = effect * effect * takeup * takeup;
    return { unit, effect, c0, c1,
      n0For: (qa, qb) => Math.pow(qa * Math.sqrt(c0) + qb * Math.sqrt(c1), 2) / denom,
      zbFor: (nEff, crit) => (effect * takeup * Math.sqrt(nEff) - crit * Math.sqrt(c0)) / Math.sqrt(c1) };
  }
  return { unit, effect, n0For: (qa, qb) => Math.pow(qa + qb, 2) * unit };
}

// Whole units, rounded up. roundEven reproduces the even-number convention of the R
// implementation used as a development benchmark (compatibility mode, tests only).
const roundUnits = (x, s) => s.roundEven ? Math.max(2, 2 * Math.ceil(x / 2)) : Math.max(2, Math.ceil(x));

/* ---------- design module registry ----------
   Each design contributes three things and inherits the rest of the tool:
     deff(s, d)       variance multiplier from the design (1 when unclustered)
     fromN0(n0, s)    turn an analysed requirement into an enrolment target
     analysed(s, d)   observations surviving to analysis, for a realised design d
   Attrition is applied to the enrolment target *after* the design is solved, never
   folded into n0 first — the design effect depends on the analysed cluster size.
   `df` is carried for the small-sample t correction and is not yet applied. */
/* Two published adjustments for unequal cluster sizes, corresponding to different analyses.
   Conservative (Eldridge/Donner): the design effect uses (1+CV²)·m̄, which is right when
   clusters are analysed as unweighted means. Efficient (van Breukelen, Candel & Berger):
   a relative-efficiency discount, which is right for a mixed-effects analysis and asks for
   less sample. The choice is exposed rather than buried, and named in the methods paragraph. */
/* The efficient adjustment has a hard validity limit, and it is exactly sqrt(3).

   Write u = rho*ma/(1-rho), so lambda = u/(1+u). Effective sample per cluster, times rho, is
       g(u) = u/(1+u) - CV^2 * u^2/(1+u)^3
   and g'(u) >= 0 reduces to  (1+u)^2 >= CV^2 * u(2-u),  i.e.  CV^2 <= (1+u)^2 / (u(2-u)).
   The right-hand side is minimised at u = 1/2, where it equals (3/2)^2 / (1/2 * 3/2) = 3.

   So the design effect is monotone in cluster size for every rho if and only if CV <= sqrt(3),
   and the bound does not depend on rho — which is why this is one number and not a curve.
   Above it, adding units per cluster can REDUCE power: at CV 1.9, rho 0.05, going from 10 to 20
   units per cluster took the required total from 2,780 to 7,000 and then back down to 4,960 at
   40. That is not a conservative answer, it is a wrong one, so the input refuses it rather than
   warning about it. The conservative form, 1 + ((1+CV^2)ma - 1)rho, is monotone for any CV and
   keeps its range of 2. */
const CV_EFFICIENT_MAX = Math.sqrt(3);
const cvFactor = s => 1 + Math.pow(s.cv || 0, 2);
function clusterDeff(ma, s) {
  const cv = s.cv || 0, icc = s.icc;
  if (!(cv > 0) || s.cvMethod !== 'efficient') return 1 + (cvFactor(s) * ma - 1) * icc;
  const lam = icc * ma / (icc * ma + 1 - icc);
  const re = 1 - lam * (1 - lam) * cv * cv;
  return (1 + (ma - 1) * icc) / Math.max(re, 1e-9);
}

/* Invert clusterDeff for the fixed-cluster-count design: find the smallest analysed
   cluster size mₐ with K·mₐ ≥ n₀·deff(mₐ). The conservative deff has a clean algebraic
   inverse and is handled in closed form by the caller; the efficient one does not.
   K·mₐ/deff(mₐ) climbs to K/ρ overall. Since the CV cap it is also monotone — that is what
   CV ≤ √3 buys — but the outward scan for the FIRST crossing is kept rather than replaced by a
   plain bisection over [0, big], which could land on a later root and return a cluster size
   several times larger than necessary. It costs little and it is the behaviour the fixed-K
   regression net was built around. */
function solveFixedKma(n0, K, s) {
  const g = ma => K * ma - n0 * clusterDeff(ma, s);
  let lo = 1e-9;
  if (g(lo) >= 0) return lo;
  for (let hi = 1e-3; hi <= 1e9; hi *= 1.02) {
    if (g(hi) >= 0) {
      for (let i = 0; i < 100; i++) {          // bracket is already within 2%; 100 is ample
        const mid = 0.5 * (lo + hi);
        if (g(mid) >= 0) hi = mid; else lo = mid;
      }
      return hi;
    }
    lo = hi;
  }
  return null;                                  // no cluster size is large enough
}

const designs = {
  simple: {
    id: 'simple',
    label: 'Individual randomisation',
    deff: () => 1,
    fromN0(n0, s) {
      const exact = n0 / (1 - s.attr);
      return { n: roundUnits(exact, s), nExact: exact, df: Infinity, dfExact: exact * (1 - s.attr) - 2 };
    },
    analysed: (s, d) => d.n * (1 - s.attr),
    dfFor: (nExact, s) => nExact * (1 - s.attr) - 2
  },

  clusterUnits: {
    id: 'clusterUnits',
    label: 'Clustered — units within a cluster',
    // Losing whole clusters costs degrees of freedom that extra units cannot restore, so it
    // inflates the number of clusters to enrol rather than the number of units.
    // Unequal cluster sizes inflate the clustering penalty: with coefficient of variation
    // CV, the design effect uses (1 + CV²)·m̄ in place of the mean analysed cluster size.
    deff: (s, d) => clusterDeff((d && d.m != null ? d.m : s.m) * (1 - s.attr), s),
    fromN0(n0, s) {
      const m = s.m, ma = m * (1 - s.attr);
      const ca = Math.min(Math.max(s.clusterAttr || 0, 0), 0.95);
      const analysedK = n0 * this.deff(s) / ma;          // clusters surviving to analysis
      const clustersExact = analysedK / (1 - ca);        // clusters to enrol
      const clusters = roundUnits(clustersExact, s);
      return { n: clusters * m, clusters, m, ma, nExact: clustersExact * m,
               df: Math.round(analysedK) - 2, dfExact: analysedK - 2, analysedK };
    },
    analysed: (s, d) => d.clusters * (1 - (s.clusterAttr || 0)) * d.m * (1 - s.attr),
    dfFor: (nExact, s) => (nExact / s.m) * (1 - (s.clusterAttr || 0)) - 2
  },

  clusterFixedK: {
    id: 'clusterFixedK',
    label: 'Clustered — fixed number of clusters',
    deff: (s, d) => clusterDeff((d && d.m != null ? d.m : s.m) * (1 - s.attr), s),
    fromN0(n0, s) {
      const ca = Math.min(Math.max(s.clusterAttr || 0, 0), 0.95);
      const K = s.m * (1 - ca);                          // clusters surviving to analysis
      // The solved cluster size must invert whichever design effect this design actually
      // uses, or the solver optimises one deff while achievedPower verifies against another.
      const efficient = (s.cv || 0) > 0 && s.cvMethod === 'efficient';   // matches clusterDeff
      let maExact;
      if (!efficient) {
        // K·mₐ = n₀·(1 + ((1+CV²)mₐ − 1)ρ)  →  mₐ = n₀(1−ρ)/(K − n₀ρ(1+CV²)), exact.
        const denom = K - n0 * s.icc * cvFactor(s);
        if (denom <= 0) return { error:
          `With ρ = ${s.icc}, no cluster size is large enough — you need more than ${Math.ceil(n0 * s.icc * cvFactor(s))} clusters. Adding units within clusters cannot compensate below that.` };
        maExact = n0 * (1 - s.icc) / denom;
      } else {
        // The efficient deff asks for less sample, so its feasibility floor is n₀ρ rather
        // than n₀ρ(1+CV²) — the conservative threshold would reject workable designs here.
        maExact = solveFixedKma(n0, K, s);
        if (maExact == null) return { error:
          `With ρ = ${s.icc}, no cluster size is large enough — you need more than ${Math.ceil(n0 * s.icc)} clusters. Adding units within clusters cannot compensate below that.` };
      }
      const mExact = maExact / (1 - s.attr);
      // A solved cluster size floors at 2 (per spec) but never takes the even-number rule:
      // the R tool this compatibility mode reproduces reports odd cluster sizes.
      const m = s.roundEven ? Math.max(1, Math.ceil(mExact)) : Math.max(2, Math.ceil(mExact));
      return { n: s.m * m, clusters: s.m, m, ma: m * (1 - s.attr), nExact: s.m * mExact,
               df: Math.round(K) - 2, dfExact: K - 2, analysedK: K };
    },
    analysed: (s, d) => d.clusters * (1 - (s.clusterAttr || 0)) * d.m * (1 - s.attr),
    dfFor: (nExact, s) => s.m * (1 - (s.clusterAttr || 0)) - 2
  }
};

function designFor(s) {
  if (!s.clustered) return designs.simple;
  return s.cmode === 'units' ? designs.clusterUnits : designs.clusterFixedK;
}

/* Build a realised design from the one quantity the mode leaves free. */
function designFromFree(f, s) {
  if (!s.clustered) return { n: f };
  return s.cmode === 'units' ? { clusters: f, m: s.m } : { clusters: s.m, m: f };
}
const totalOf = (f, s) => !s.clustered ? f : (s.cmode === 'units' ? f * s.m : s.m * f);

/* Monotone fallback. Power rises with sample size, so the smallest adequate design can always
   be found by bisection. The fixed-point iteration is faster and is what the specification
   describes, but at very small samples the t quantiles make the map non-contractive — it
   oscillates and has no fixed point — and there the answer must come from the definition
   itself: the smallest design reaching the target power. */
function solveByPower(s, mde) {
  const target = s.power;
  const powerAt = f => {
    const r = achievedPower(mde, s, designFromFree(f, s));
    return r.error ? null : r.power;
  };
  let hi = 4, top = null;
  for (let i = 0; i < 200 && hi < 1e15; i++) {
    const p = powerAt(hi);
    if (p !== null && p >= target) { top = hi; break; }
    hi *= 1.6;
  }
  if (top === null) return null;
  let lo = 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const p = powerAt(mid);
    if (p !== null && p >= target) hi = mid; else lo = mid;
  }
  const f = hi;
  if (!s.clustered) return { n: roundUnits(f, s), nExact: f, df: Infinity, dfExact: f * (1 - s.attr) - 2 };
  if (s.cmode === 'units') {
    const k = roundUnits(f, s);
    return { n: k * s.m, clusters: k, m: s.m, ma: s.m * (1 - s.attr), nExact: f * s.m, df: k - 2, dfExact: f - 2 };
  }
  const m = roundUnits(f, s);
  return { n: s.m * m, clusters: s.m, m, ma: m * (1 - s.attr), nExact: s.m * f, df: s.m - 2, dfExact: s.m - 2 };
}

/* ---------- solve for sample size (the default direction) ----------
   With the t correction the quantiles depend on df, which depends on the answer, so
   solve by fixed-point iteration from the normal-approximation starting value. */
function requiredSample(mde, s, exactOnly) {
  const b = baseRequirement(mde, s);
  if (b.error) return b;
  const design = designFor(s);
  const first = design.fromN0((q => b.n0For(q.qa, q.qb))(quantileParts(s, Infinity)), s);
  if (s.tCorrect === false || first.error) return first;
  if (s.clustered && s.cmode === 'clusters' && !(s.m - 2 > 0))
    return { error: 'A clustered design needs at least 3 clusters to estimate a standard error.' };

  // Iterate on the unrounded total only. Damping is applied to that scalar, and the design is
  // rebuilt once from the converged value — mixing the two (damping a value already used to
  // produce a rounded answer) leaves n and nExact describing different iterates.
  let x = first.nExact;
  for (let i = 0; i < 80; i++) {
    const cand = design.fromN0((q => b.n0For(q.qa, q.qb))(quantileParts(s, Math.max(1, design.dfFor(x, s)))), s);
    if (cand.error) return cand;
    let nx = cand.nExact;
    if (i >= 6) nx = 0.5 * (nx + x);              // damp any oscillation
    const done = Math.abs(nx - x) <= 1e-12 * Math.max(1, x);
    x = nx;
    if (done) break;
  }
  const check = design.fromN0((q => b.n0For(q.qa, q.qb))(quantileParts(s, Math.max(1, design.dfFor(x, s)))), s);
  // only genuinely oscillating designs fall back; ordinary rounding-level residue does not
  const settled = !check.error && Math.abs(check.nExact - x) <= 1e-3 * Math.max(1, x);
  return makeFeasible(settled ? check : (solveByPower(s, mde) || check), s, mde, exactOnly);
}

/* ---------- integer feasibility ----------
   A continuous solution can imply 29.5 clusters per arm, or a total that does not divide
   equally across control and each treatment arm. The design that actually gets run is the
   integer one, so the answer is stepped up to a feasible allocation and then checked: if
   rounding has pushed realised power below target, take one more step. */
function makeFeasible(out, s, mde, exactOnly) {
  if (out.error) return out;
  // The MDE search only ever reads nExact, which rounding and trimming never touch, so doing
  // either for it is pure waste — and it is waste multiplied by 80, once per bisection step.
  if (exactOnly) return out;
  const groups = Math.max(1, s.arms || 1) + 1;
  // the effect being solved for, which is not always the one in the MDE field: the chart and
  // the MDE inversion both call this with other values
  const powerOf = d => { const r = achievedPower(mde, s, d); return r.error ? -1 : r.power; };
  const target = s.power - 1e-12;

  /* Rounding up, and a quantile seed that is only an approximation of the exact noncentral-t
     requirement, can leave the design one step larger than it needs to be. Stepping up alone
     can never find that, so trim back down: the answer is the smallest feasible design that
     reaches the target, which is what the Documentation tab claims and what the fixed-K
     defect taught us to check. Exempt in compatibility mode, which exists to reproduce
     another implementation's rounding convention rather than to be minimal. */
  const trim = (value, step, floor, ok) => {
    if (s.tCorrect === false) return value;
    const maxDown = Math.floor((value - floor) / step);
    if (!(maxDown > 0)) return value;
    // Bisect on how many steps down still reach the target, rather than walking. An
    // ill-conditioned design — few clusters, power near its asymptote, so the curve is almost
    // flat — can sit hundreds of steps above the minimum, and a capped walk stops partway and
    // silently leaves the answer too big. That is how the first version of this got it wrong.
    // Assumes power rises with size, which holds everywhere except the CV region the tool
    // already warns about.
    // Gallop down (1, 2, 4, 8 ...) until a candidate fails, then bisect inside that bracket.
    // Bisecting the whole range instead costs ~54 power evaluations even when the overshoot is
    // zero, which is the common case; this costs one. Math.floor, never >>1: a bitwise shift
    // truncates to int32, and a degenerate design can need a sample of 1e16, where the
    // midpoint wraps negative and the loop never ends.
    let k = 1, lastOk = 0;
    while (k <= maxDown && ok(value - k * step)) { lastOk = k; k *= 2; }
    let lo = lastOk, hi = Math.min(k, maxDown + 1);          // ok(lo) holds, ok(hi) does not
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      // Above about 2^53 the midpoint can round to an endpoint and the loop stops advancing.
      // A degenerate design here needs n ~ 1e17, where the gap between representable doubles
      // is 16, so this is reachable and it hangs the page rather than merely being slow.
      if (mid <= lo || mid >= hi) break;
      if (ok(value - mid * step)) lo = mid; else hi = mid;
    }
    return value - lo * step;
  };

  if (!s.clustered) {
    let n = out.n, step = groups > 2 ? groups : 1;
    if (groups > 2) n = Math.ceil(n / groups) * groups;
    else if (s.prop !== 0.5) {
      // an unequal split has to round up in each arm separately — you cannot enrol 269.7 controls
      n = Math.ceil(out.nExact * s.prop) + Math.ceil(out.nExact * (1 - s.prop));
    }
    for (let i = 0; i < 500 && powerOf({ n }) < target; i++) n += step;
    n = trim(n, step, 2, v => powerOf({ n: v }) >= target);
    return Object.assign({}, out, { n, perGroup: groups > 2 ? n / groups : null });
  }
  if (s.cmode === 'units') {
    let k = out.clusters, step = groups > 2 ? groups : 2;   // whole clusters, split equally
    k = Math.ceil(k / step) * step;
    for (let i = 0; i < 500 && powerOf({ clusters: k, m: out.m }) < target; i++) k += step;
    k = trim(k, step, 2, v => powerOf({ clusters: v, m: out.m }) >= target);
    return Object.assign({}, out, { clusters: k, n: k * out.m, perGroup: k / groups });
  }
  // fixed cluster count: the free quantity is the cluster size
  let m = out.m;
  for (let i = 0; i < 500 && powerOf({ clusters: out.clusters, m }) < target; i++) m += 1;
  m = trim(m, 1, 2, v => powerOf({ clusters: out.clusters, m: v }) >= target);
  return Object.assign({}, out, { m, n: out.clusters * m,
    clustersPerGroup: out.clusters % groups === 0 ? out.clusters / groups : null });
}

/* ---------- solve for MDE, given a sample size ----------
   nExact is strictly decreasing in MDE, so invert by bisection in log space. */
function mdeCeilingFor(s) {
  if (!s.binary) return Math.max(1, s.mde * 1e3);
  return (s.binaryDir === 'decrease' ? s.p0 : 1 - s.p0) - 0.001;
}
function sampleAt(mde, s) {
  const r = requiredSample(mde, s, true);          // nExact only; skip rounding and the trim
  return (r.error || !isFinite(r.nExact)) ? null : r.nExact;   // null = infeasible, treat as ∞
}
function mdeForSampleSize(target, s) {
  const ceiling = mdeCeilingFor(s);
  const nTop = sampleAt(ceiling, s);
  if (nTop === null || nTop > target) return null;             // unreachable within a valid MDE
  let lo = Math.min(1e-9, s.mde / 1e6), hi = ceiling;
  for (let i = 0; i < 80; i++) {
    // Do NOT add an early convergence break here. Geometric bisection is converged to ~1e-12
    // by step 40 and the remaining 40 refine nothing you can see — but breaking moved 93 of
    // the 948 oracle cases in the 13th significant digit, and byte-identical oracle output is
    // worth more than the 12 ms. The chart no longer calls this function at all, which is
    // where the cost actually mattered.
    const mid = Math.sqrt(lo * hi);
    const v = sampleAt(mid, s);
    if (v === null || v > target) lo = mid; else hi = mid;
  }
  return hi;
}

/* ---------- solve for power, given a realised design ----------
   d is {n} for an unclustered design, {clusters, m} for a clustered one. */
function achievedPower(mde, s, d) {
  const b = baseRequirement(mde, s);
  if (b.error) return b;
  const design = designFor(s);
  const analysed = design.analysed(s, d), deff = design.deff(s, d);
  if (!(analysed > 0) || !(deff > 0)) return { error: 'That design has no observations to analyse.' };
  const df = d.clusters ? d.clusters * (1 - (s.clusterAttr || 0)) - 2 : analysed - 2;
  const useT = s.tCorrect !== false && df > 0;
  const twoSided = s.sided !== 1, alpha = adjustedAlpha(s);
  const crit = useT ? invT(twoSided ? 1 - alpha/2 : 1 - alpha, df)
                    : invNorm(twoSided ? 1 - alpha/2 : 1 - alpha);
  let each;
  if (b.zbFor) {                       // binary score test
    const qb = b.zbFor(analysed / deff, crit);
    // The df > 3000 switch has to be the SAME here as in invT and tncCdf. `crit` above already
    // came from the normal at that point, so calling tCdf here took the critical value from one
    // distribution and the tail probability from another — a mismatch of about 1e-6 in the far
    // tail. Small, but it is two distributions in one expression, and it is what made eleven
    // oracle cases disagree.
    each = (useT && df <= 3000) ? tCdf(qb, df) : normCdf(qb);
  } else {
    const ncp = Math.sqrt(analysed / deff / b.unit);
    // Exact noncentral t (AS 243), the same algorithm behind R's pt(q, df, ncp). This used to
    // be a central t shifted by the noncentrality — a good approximation, but not the
    // definition. Upper tail only, which is the convention R's power.t.test follows: the far
    // tail is the chance of rejecting in the WRONG direction, and counting it as power would
    // be generous. Including it moved us off R by about 1e-6; leaving it out reproduces R to
    // machine precision.
    // The normal branch is deliberately untouched: compatibility mode reproduces Stata's
    // cluster examples and the benchmark implementation exactly, and both use the normal form.
    each = useT ? 1 - tncCdf(crit, df, ncp) : normCdf(ncp - crit);
  }
  // translate per-comparison power into the joint claim the user selected
  const m = comparisons(s);
  const power = (m > 1 && (s.powerDef === 'all' || s.powerDef === 'any'))
    ? jointFromEach(each, s, m, invNorm(1 - alpha / (twoSided ? 2 : 1)))
    : each;
  return { power, each, analysed, deff, df };
}

/* ---------- cost ----------
   Cost is arithmetic on a design rather than statistics, but it lives inside the engine
   deliberately: above this boundary it is a pure function, so it can be unit-tested with no
   DOM and hammered by the property sweep in tests/cost.js.

       C = fixed + perCluster·clusters + perParticipant·participants

   Two things this function has to get right, neither of which is visible on inspection.

   1. It prices the ENROLLED sample, never the analysed one. You pay to recruit, enrol and
      attempt to survey everyone who starts; attrition destroys data, not invoices. Every
      design's fromN0() already inflates by 1/(1−attr) before returning, so taking d.n and
      d.clusters as they come is correct. Switching to the analysed count would understate
      cost by the attrition rate while every number on screen still looked plausible.

   2. It reads the DESIGN, never the state. In the fixed-K mode s.m holds the *number of
      clusters* while d.m holds the solved cluster size; in the units mode it is the other
      way round. Reading s.m here would silently price two different quantities depending on
      a mode this function cannot see.

   Returns null when nothing has been priced, which is what keeps the whole feature invisible
   until someone enters a price — one check at the source rather than six downstream. */
function costOf(d, p) {
  if (!d || !p) return null;
  // A blank field parses to NaN, and NaN is falsy, so blank and zero both collapse to 0 here.
  const perParticipant = p.perParticipant || 0;
  const perCluster = p.perCluster || 0;
  const fixed = p.fixed || 0;
  if (!(perParticipant > 0 || perCluster > 0 || fixed > 0)) return null;
  // Enrolled totals straight off the design: unclustered carries {n}, clustered {clusters, m}.
  const participants = d.n != null ? d.n : (d.clusters || 0) * (d.m || 0);
  const clusters = d.clusters || 0;
  const participant = perParticipant * participants;
  const cluster = perCluster * clusters;
  const total = fixed + cluster + participant;
  if (!isFinite(total) || total < 0) return null;
  return { total, fixed, cluster, participant, participants, clusters };
}

/* ---------- the marginal cost of power ----------
   A total answers "what does this study cost". This answers the question people actually
   argue about in a budget meeting: "what would it cost to not be underpowered". It solves the
   design again at a slightly higher power and differences the two bills.

   Three things it has to get right.

   1. It steps from the REALISED power, not the target. Cluster counts and sample sizes are
      integers, so a design solved for 80% typically lands a little above it. Stepping from
      0.80 when the design on screen actually delivers 0.827 would quote the cost of a step
      the user has already partly paid for.

   2. It steps from the realised power to a realised power. The returned design is the
      minimum integer design at the target, so it too overshoots; reporting the target would
      print a cost that does not reproduce if you re-enter the printed design.

   3. It forces cmode to 'units' outside sample-size mode. In the fixed-K mode s.m carries the
      *number of clusters*, and that mode's field is only on screen while solving for sample
      size. A stale 'clusters' left in the state would make requiredSample read the cluster
      size as a cluster count — a wrong answer that looks entirely plausible. Holding cluster
      size fixed and buying more clusters is also the right economics for every direction
      except the one where the user has explicitly fixed the number of clusters.

   Returns null when there is nothing to say — no price, no finite base, or a step that would
   run past 99%, where the power curve is flat enough that the marginal cost is both enormous
   and meaningless. Returns {target, error} when no design reaches the step, which is a real
   answer in fixed-K mode: past a point, no cluster size gets you there at all. */
// Five points is the conventional gap people argue over — 80% to 85% — and it is large enough
// that the answer is not swallowed by integer rounding on a small design.
const POWER_STEP = 0.05;
function powerStepCost(s, r, prices, step) {
  const baseCost = costOf(r, prices);
  if (!baseCost || !r || r.error) return null;
  // Realised power of the design on screen, in every direction. In power mode r.power already
  // is realised; recomputing it costs nothing and keeps the three modes on one path.
  const base = achievedPower(r.mde, s, r);
  if (base.error || !isFinite(base.power)) return null;
  const target = base.power + step;
  if (!(target > 0) || target > 0.99) return null;
  // See note 3: outside sample-size mode cmode is stale and s.m means something else there.
  const sStep = r.mode === 'n' ? s : Object.assign({}, s, { cmode: 'units' });
  const design = requiredSample(r.mde, Object.assign({}, sStep, { power: target }));
  if (design.error) return { step, from: base.power, target, error: design.error };
  const cost = costOf(design, prices);
  if (!cost) return null;
  const to = achievedPower(r.mde, sStep, design);
  return { step, from: base.power, target,
           to: (to.error || !isFinite(to.power)) ? target : to.power,
           total: cost.total, delta: cost.total - baseCost.total, design };
}

/* ---------- the budget inverse ----------
   Every other cost function here answers "what does this design cost". This one answers the
   question a PI actually walks in with: "I have this much money — what can I detect with it?"

   It is a PRE-STEP, not a fourth solve direction. It works out the largest design the budget
   affords and hands that design to machinery that already exists — mdeForSampleSize() or
   achievedPower(). Nothing about solveFor, the URL schema, or the generated R and Stata code
   changes, which is why a feature this visible costs the rest of the tool nothing.

   Three branches, because what a budget buys depends on which dimension is free to move.

   - Unclustered: the budget buys participants.   N = floor((B − F) / c_i)
   - Clustered, cluster SIZE fixed: it buys whole clusters, each costing c_K + m·c_i.
                                                  K = floor((B − F) / (c_K + m·c_i))
   - Clustered, cluster COUNT fixed: the clusters are paid for first, whatever they cost, and
     what is left buys depth inside them.         m = floor((B − F − K·c_K) / (K·c_i))

   Floor everywhere. Never ceiling, never round. The budget binds — that is the whole premise —
   and "you can afford 41 clusters" when the 41st costs $300 more than the user has is the one
   failure mode that makes the feature worse than not having it.

   The same floor gives the residual its meaning. In all three branches the money left over is
   what could not buy one more of whatever the budget was buying, so 0 ≤ residual < unit holds
   by construction, and `unit` is the thing to report it as a fraction of.

   Returns null when there is nothing to say: no budget typed, or no price on the dimension the
   budget would buy. Returns {error: <code>} rather than a sentence — this function sits above
   the engine boundary and fmtMoney() lives below it, so the renderer does the wording. */
function affordableDesign(s, p, budget) {
  if (!p || !isFinite(budget) || budget <= 0) return null;
  // A blank price parses to NaN; NaN > 0 is false, so blank and zero both collapse to 0.
  const ci = p.perParticipant > 0 ? p.perParticipant : 0;
  const cK = p.perCluster > 0 ? p.perCluster : 0;
  const fixed = p.fixed > 0 ? p.fixed : 0;
  // Priced on fixed costs alone there is no design to solve for: nothing scales with money.
  if (!(ci > 0 || cK > 0)) return null;
  const free = budget - fixed;
  if (!(free > 0)) return { error: 'fixed', budget, fixed };

  // The two floors below are validate()'s own minima — nGiven ≥ 4, kGiven ≥ 3 — so a design
  // this function reports back is always one the tool would accept if it were typed in.
  const N_MIN = 4, K_MIN = 3;
  let d = null;
  if (!s.clustered) {
    if (!(ci > 0)) return null;
    // pricesFrom() already zeroes F and c_K for unclustered designs, so `free` is `budget`
    // here. Subtracting anyway keeps the branch correct rather than merely lucky.
    const n = Math.floor(free / ci);
    if (n < N_MIN) return { error: 'small', budget, got: n, need: N_MIN, unitLabel: 'participant' };
    d = { n, unit: ci, unitLabel: 'participant' };
  } else if (s.cmode === 'clusters') {
    // The cluster count is the user's input, so the budget buys depth inside it.
    const K = s.m;
    if (!(K >= K_MIN) || !(ci > 0)) return null;
    const afterClusters = free - cK * K;
    const m = afterClusters > 0 ? Math.floor(afterClusters / (K * ci)) : 0;
    // One message for both ways this fails — the clusters themselves are unaffordable, or they
    // are affordable but leave nothing to put in them — quoting the cheapest design that works.
    if (m < 1) return { error: 'clusters', budget, clusters: K, need: fixed + K * (cK + ci) };
    d = { n: K * m, clusters: K, m, unit: K * ci, unitLabel: 'unit in every cluster' };
  } else {
    // Cluster size is the user's input, so the budget buys whole clusters at that size.
    const m = s.m;
    if (!(m >= 1)) return null;
    const perCluster = cK + m * ci;
    if (!(perCluster > 0)) return null;
    const K = Math.floor(free / perCluster);
    if (K < K_MIN) return { error: 'small', budget, got: K, need: K_MIN, unitLabel: 'cluster' };
    d = { n: K * m, clusters: K, m, unit: perCluster, unitLabel: 'cluster' };
  }
  // Price the design the same way everything else in the tool is priced, rather than trusting
  // the arithmetic above to have inverted itself correctly. If the two ever disagree, the
  // residual goes negative and says so.
  const cost = costOf(d, p);
  if (!cost) return null;
  return Object.assign(d, { budget, spent: cost.total, residual: budget - cost.total });
}

/* ---------- the cost-optimal cluster size, as an advisory and nothing more ----------
   The budget inverse above deliberately holds the user's cluster size fixed and solves only
   for the number of clusters: class sizes, village rosters and clinic caseloads are usually
   fixed in the field, and a tool that silently re-optimises m answers a question the
   researcher cannot act on. But having computed what the best cluster size would be and then
   saying nothing is the worse failure — the user is one square root away from learning their
   design is 20% off the efficient frontier.

   So: compute it, and surface one line only when the entered size is materially off. Four
   things about this that are easy to get wrong.

   1. The optimum is over the ENROLLED cluster size, because that is what the user typed and
      what the per-participant price is charged on — but the variance depends on the ANALYSED
      size, m·(1−attr). The textbook formula (Raudenbush 1997) assumes no attrition, so it
      needs an extra (1−attr) term; without it the tool would recommend an enrolled size
      derived as though it were the analysed one. Cluster-level attrition, by contrast, scales
      the number of clusters by a constant and does not move the optimum at all.

   2. The objective is the tool's own design effect, not a private formula. What a budget buys,
      in variance, from one enrolled cluster of size m is
          h(m) = deff(m(1−a)) · (c_K + m·c_i) / (m(1−a))
      and the budget and the fixed cost both cancel out of a ratio of two of these — which is
      why this advisory needs no budget to be entered, and does not change when one is.

   3. The square root is a SEED, not the answer, and that distinction was measured rather than
      assumed. With equal cluster sizes, minimising h with deff = 1 + (m_a − 1)ρ gives
          m* = sqrt( (c_K/c_i) · (1−ρ) / ((1+CV²)·ρ·(1−a)) )
      — the textbook result at CV = 0 and a = 0 — and over a 400-case sweep that rounds to the
      exact integer minimiser every single time. It does NOT survive unequal cluster sizes: the
      conservative adjustment folds into the (1+CV²) term above, but the efficient adjustment
      is a relative-efficiency discount that is not linear in cluster size, and there the closed
      form was off by up to 10 participants and 20% of variance. So the seed is only a starting
      point: the answer is found by bracketing and searching under the real deff, which is
      exact, and means the number in the sentence is by construction the best cluster size this
      tool's own arithmetic can find rather than an approximation to it. Sabotaging the seed
      formula is therefore invisible in the answer, by design — it costs a few more evaluations
      and nothing else.

   4. It fires at a deliberately wide threshold, past 2× or below 0.5×. Budget-constrained MDE
      is flat near an interior optimum: within roughly 0.6×–1.6× the penalty is under 2%, far
      below the error in the user's ICC guess, and a line firing there would be noise dressed
      as advice. And m* inherits that guess — moving ρ from 0.05 to 0.10 moves it by about
      45% — which is why the sentence says "at these costs and this ICC" rather than presenting
      one number as a fact. */

/* Variance per unit of budget for enrolled cluster size m: the quantity the optimum minimises. */
function budgetVariance(s, p, m) {
  const ma = m * (1 - Math.min(Math.max(s.attr || 0, 0), 0.95));
  if (!(ma > 0)) return Infinity;
  return clusterDeff(ma, s) * (p.perCluster + m * p.perParticipant) / ma;
}

function optimalClusterSize(s, p) {
  if (!s || !s.clustered || !p) return null;
  const ci = p.perParticipant, cK = p.perCluster, rho = s.icc;
  if (!(ci > 0) || !(cK > 0) || !(rho > 0) || !(rho < 1)) return null;
  const a = Math.min(Math.max(s.attr || 0, 0), 0.95);
  const cv = s.cv > 0 ? s.cv : 0;
  const seed = Math.sqrt((cK / ci) * (1 - rho) / ((1 + cv * cv) * rho * (1 - a)));
  if (!isFinite(seed) || !(seed > 0)) return null;
  // A cluster of one is not a cluster, and the design effect is degenerate there.
  let m = Math.max(2, Math.round(seed)), v = budgetVariance(s, p, m);
  if (!isFinite(v)) return null;

  /* h is unimodal in cluster size — the UI caps CV at √3, which is exactly the bound above
     which the design effect stops being monotone in cluster size — so the minimum can be
     bracketed and then searched, and the result does not depend on the seed being good.

     That independence was worth buying. An earlier version walked downhill from the seed in
     unit steps, which is exact but takes as many steps as the seed is wrong by; sabotaging the
     seed formula then produced a wrong recommendation rather than a slower correct one, which
     is a bad property for the one number on this page that is advice. Bracket geometrically,
     then search the bracket, and a seed out by six orders of magnitude costs a few dozen
     extra evaluations and changes no answer. */
  /* The ceiling is what keeps the bracket in exact integer arithmetic. Doubling is capped at 80
     steps, so an objective that never turns — which real prices cannot produce, but a corrupted
     budgetVariance can — walks m up to 2^80, where a double's spacing is around 1e8 and the
     ternary step below rounds to no movement at all and spins forever. Ten million participants
     per cluster is far past any design this tool would be asked about (it needs a cluster-to-
     participant price ratio around 1e11) and is comfortably inside exact integer doubles. */
  const M_MAX = 1e7;
  for (const f of [2, 0.5]) {                       // expand until the objective turns
    for (let i = 0; i < 80; i++) {
      const m2 = Math.min(M_MAX, Math.max(2, Math.round(m * f)));
      if (m2 === m) break;
      const v2 = budgetVariance(s, p, m2);
      if (!(v2 < v)) break;
      m = m2; v = v2;
    }
  }
  // The last step that failed bounds the minimum on both sides, so this bracket contains it.
  let lo = Math.max(2, Math.floor(m / 2)), hi = Math.min(M_MAX, Math.max(lo + 1, Math.ceil(m * 2)));
  while (hi - lo > 2) {                             // ternary search, exact for a unimodal h
    const third = Math.floor((hi - lo) / 3);
    const a1 = lo + third, b1 = hi - third;
    if (budgetVariance(s, p, a1) <= budgetVariance(s, p, b1)) hi = b1; else lo = a1;
  }
  for (let k = lo; k <= hi; k++) {                  // and pick among the two or three survivors
    const vk = budgetVariance(s, p, k);
    if (vk < v) { v = vk; m = k; }
  }
  return m;
}

function clusterSizeAdvice(s, p, m) {
  const mStar = optimalClusterSize(s, p);
  if (mStar === null || !(m >= 1)) return null;
  const ratio = m / mStar;
  if (ratio > 0.5 && ratio < 2) return null;          // inside the flat region: say nothing
  const here = budgetVariance(s, p, m), best = budgetVariance(s, p, mStar);
  if (!isFinite(here) || !isFinite(best) || !(best > 0)) return null;
  // MDE scales with the square root of variance, so that is the currency the line quotes.
  const penalty = Math.sqrt(here / best) - 1;
  if (!(penalty > 0)) return null;
  return { mStar, m, penalty };
}

function pricesFrom(s) {
  // Both cluster-scale prices are gated on the design, not just hidden by it: a price the
  // user cannot see must not reach the total, or switching to an individual design leaves an
  // invisible cost in the answer.
  return { perParticipant: s.costPer,
           perCluster: s.clustered ? s.costCluster : 0,
           fixed: s.clustered ? s.costFixed : 0 };
}

/* The realised design implied by the inputs, when the user supplies it rather than
   solving for it: {n} unclustered, {clusters, m} clustered. */
function givenDesign(s) {
  return s.clustered ? { clusters: s.kGiven, m: s.m } : { n: s.nGiven };
}

/* One entry point for all three directions. Returns a common shape so the result
   text and the chart never have to know which direction was asked for. */
function solve(s) {
  const r = solveCore(s);
  if (r.error) return r;
  // The single confluence point. Every direction normalises to a shape carrying the enrolled
  // total and, when clustered, the enrolled cluster count, so pricing here once reaches the
  // readout, the sensitivity table, the chart and the export without any of them knowing
  // which direction was asked for. Computing it downstream would mean writing it six times.
  const cost = costOf(r, pricesFrom(s));
  if (cost) r.cost = cost;
  return r;
}

function solveCore(s) {
  if (solveFor === 'n') {
    const r = requiredSample(s.mde, s);
    return r.error ? r : Object.assign({ mode: 'n', mde: s.mde, power: s.power }, r);
  }
  const d = givenDesign(s);
  if (solveFor === 'power') {
    const r = achievedPower(s.mde, s, d);
    return r.error ? r : Object.assign({ mode: 'power', mde: s.mde, n: d.n || d.clusters * d.m }, d, r);
  }
  // solve for MDE: invert on the sample the user has
  const total = d.n || d.clusters * d.m;
  const mde = mdeForSampleSize(total, s);
  if (mde === null || !isFinite(mde))
    return { error: 'No detectable effect reaches that power with this design — even a very large effect would need a bigger sample.' };
  return Object.assign({ mode: 'mde', mde, n: total, power: s.power }, d);
}

/* Joins the affordable design to the statistics: what the budget buys, expressed as the same
   kind of answer the user is already solving for. Lives here rather than inside
   affordableDesign() so that function stays pure arithmetic, testable without an engine. */
function budgetAnswer(s, r, prices, budget) {
  if (!r || r.error) return null;
  // See powerStepCost note 3. Outside sample-size mode the cluster-input selector is off
  // screen and s.m is always a cluster SIZE, whatever a stale cmode still says. Reading it as
  // a cluster count there would price and solve two different designs, both plausible-looking.
  const sBud = r.mode === 'n' ? s : Object.assign({}, s, { cmode: 'units' });
  const d = affordableDesign(sBud, prices, budget);
  if (!d || d.error) return d;
  const design = s.clustered ? { clusters: d.clusters, m: d.m } : { n: d.n };
  if (r.mode === 'power') {
    // In power mode the effect is the user's input and power is the answer, so the budget's
    // answer is the power it buys at that same effect.
    const a = achievedPower(s.mde, sBud, design);
    if (a.error || !isFinite(a.power)) return Object.assign({ error: 'nopower' }, d);
    return Object.assign({ power: a.power }, d);
  }
  // Everywhere else the answer is an effect size. d.n is an ENROLLED total, and
  // mdeForSampleSize() takes enrolled totals — sampleAt() returns requiredSample().nExact,
  // which is already inflated by 1/(1−attrition). Deflating here would be the enrolled-versus-
  // analysed trap in its most expensive form: it would overstate what the money buys.
  const mde = mdeForSampleSize(d.n, sBud);
  if (mde === null || !isFinite(mde)) return Object.assign({ error: 'nomde' }, d);
  return Object.assign({ mde }, d);
}

function describeDesign(s, r) {
  if (!s.clustered) return `${fmt(r.n)} individuals`;
  return `${fmt(r.n)} in ${fmt(r.clusters)} clusters of ${fmt(r.m)}`;
}

const pct = v => `${(+(v * 100).toPrecision(4))}%`;

/* Structured after power sections in published evaluation protocols: design and unit
   of randomisation, then each assumption with its source, then the result in interpretable
   units, then what the calculation does not cover. [square brackets] mark what the user
   must supply — the paragraph is a scaffold, not a claim we can make on their behalf. */
function methodsParagraph(s, r) {
  const P = [];
  const unit = s.clustered ? '[clusters — e.g. schools, villages]' : '[units — e.g. households, individuals]';
  const arms = (s.arms || 1) > 1
    ? `${s.arms} treatment arms and a control group, with the sample split equally across arms`
    : 'a treatment group and a control group';
  P.push(`We plan a ${s.clustered ? 'cluster-randomised' : 'randomised'} evaluation of [intervention] in which ${unit} are assigned to ${arms}.` +
    (s.clustered ? ` Randomisation is at the cluster level, and outcomes are measured on individuals within clusters.` : ''));

  const asm = [];
  asm.push(`a significance level of ${s.alpha} (${s.sided === 1 ? 'one-sided' : 'two-sided'})`);
  asm.push(r.mode === 'power' ? `the sample described below` : `${pct(s.power)} power`);
  asm.push(s.binary
    ? `a binary outcome with a baseline proportion of ${s.p0}, based on [source]`
    : `a continuous outcome with a standard deviation of ${s.sd}, based on [source]`);
  if (s.clustered) asm.push(`an intracluster correlation of ρ = ${s.icc}, based on [source]`);
  if (s.clustered && s.cv > 0) asm.push(`a coefficient of variation in cluster size of ${s.cv}, adjusted for ${s.cvMethod === 'efficient' ? 'an efficient mixed-effects analysis' : 'analysis at the cluster level (conservative)'}`);
  if (s.clustered && s.clusterAttr > 0) asm.push(`loss of ${pct(s.clusterAttr)} of clusters, based on [source]`);
  if (s.tut < 1 || s.tuc > 0) asm.push(`take-up of ${pct(s.tut)} in the treatment group and ${pct(s.tuc)} in the control group, based on [source]`);
  if (s.attr > 0) asm.push(`attrition of ${pct(s.attr)}, based on [source]`);
  if (s.r2 > 0) asm.push(`baseline covariates explaining R² = ${s.r2} of outcome variance, based on [source]`);
  P.push(`Calculations assume ${asm.slice(0, -1).join('; ')}; and ${asm[asm.length - 1]}.`);

  const eff = s.binary ? `${(+(r.mde * 100).toPrecision(3))} percentage points` : `${+r.mde.toPrecision(4)} [units]`;
  const rel = s.binary ? `a ${(100 * r.mde / s.p0).toFixed(0)}% change relative to the baseline proportion`
                       : `${(r.mde / s.sd).toPrecision(2)} standard deviations`;
  if (r.mode === 'power') {
    P.push(`Under these assumptions, ${describeDesign(s, r)} gives ${pct(r.power)} power to detect an effect of ${eff}, equivalent to ${rel}.`);
  } else if (r.mode === 'mde') {
    P.push(`Under these assumptions, ${describeDesign(s, r)} is sufficient to detect an effect of ${eff}, equivalent to ${rel}. Effects smaller than this are unlikely to be distinguishable from zero.`);
  } else {
    P.push(`Under these assumptions, detecting an effect of ${eff} — equivalent to ${rel} — requires ${describeDesign(s, r)}.`);
  }

  const m = comparisons(s);
  if (m > 1) {
    const defTxt = s.powerDef === 'any' ? 'at least one comparison is detected'
                 : s.powerDef === 'all' ? 'every comparison is detected'
                 : 'any given comparison is detected';
    const cTxt = s.correction && s.correction !== 'none'
      ? `The significance level is adjusted for ${m} comparisons using the ${{bonferroni:'Bonferroni',sidak:'Šidák',effective:'correlation-discounted (experimental)'}[s.correction]} correction`
      : `No multiple-comparison correction is applied across the ${m} comparisons`;
    P.push(`${cTxt}, and power is reported as the probability that ${defTxt}.`);
  }

  const caveats = [];
  if (!s.r2) caveats.push('precision gains from baseline covariates');
  caveats.push('stratification or blocking');
  if (!s.clustered) caveats.push('any clustering in outcomes');
  P.push(`These calculations do not account for ${caveats.join(', ')}. ` +
    `Power was calculated using the Power Calculator, following Duflo, Glennerster and Kremer (2007), ` +
    `with quantiles from the t distribution on the degrees of freedom implied by the design.`);
  return P.join('\n\n');
}

/* Code generation must reproduce the calculation on screen, or say that it cannot.
   Anything else invites a reader of an appendix to run code that disagrees with the paper. */
function unsupportedFor(s, lang) {
  const why = [];
  if (s.ni) why.push('non-inferiority');
  if (lang === 'stata' && comparisons(s) > 1 && s.powerDef !== 'each')
    why.push('joint power over several tests (needs numerical integration)');
  return why;
}

function assumptionsTable(s, r) {
  const pct = v => `${(+(v * 100).toPrecision(4))}%`;
  // Parameter and value only. There used to be a third column tagging each row
  // convention / design / calculated / [source]; nothing on screen explained it, so it read
  // as noise in a table meant to be pasted straight into an appendix.
  const rows = [['Significance level', `${s.alpha}${s.sided === 1 ? ' (one-sided)' : ' (two-sided)'}`],
                [r.mode === 'power' ? 'Power (result)' : 'Power', r.mode === 'power' ? pct(r.power) : s.power],
                [r.mode === 'mde' ? 'MDE (result)' : 'Minimum detectable effect',
                 s.binary ? `${(+(r.mde * 100).toPrecision(3))} pp ${s.binaryDir}` : +r.mde.toPrecision(4)]];
  if (s.binary) rows.push(['Baseline proportion', s.p0]);
  else rows.push(['Outcome SD', s.sd]);
  if (s.r2 > 0) rows.push(['Covariate R²', s.r2]);
  if (s.arms > 1) rows.push(['Treatment arms', s.arms]);
  else rows.push(['Proportion in treatment', s.prop]);
  if (s.outcomes > 1) rows.push(['Primary outcomes', s.outcomes]);
  if (comparisons(s) > 1) rows.push(['Multiplicity correction', s.correction === 'none' ? 'none' : s.correction]);
  if (s.tut < 1 || s.tuc > 0) rows.push(['Take-up (treatment / control)', `${pct(s.tut)} / ${pct(s.tuc)}`]);
  if (s.attr > 0) rows.push(['Individual attrition', pct(s.attr)]);
  if (s.clustered) {
    rows.push(['Intracluster correlation', s.icc]);
    if (s.cv > 0) rows.push(['Cluster size CV', `${s.cv} (${s.cvMethod === 'efficient' ? 'efficient mixed-effects' : 'conservative'})`]);
    if (s.clusterAttr > 0) rows.push(['Cluster attrition', pct(s.clusterAttr)]);
    rows.push(['Clusters', r.clusters]);
    rows.push(['Units per cluster', r.m]);
  }
  rows.push(['Total sample size', fmt(r.n)]);
  const w = Math.max(...rows.map(x => String(x[0]).length));
  return rows.map(x => `${String(x[0]).padEnd(w)}  ${x[1]}`).join('\n');
}

/* Shared preamble: the parameters and the core quantity, identical across modes. */
function rPreamble(s) {
  const L = [];
  L.push(`alpha    <- ${s.alpha}`);
  L.push(`sided    <- ${s.sided === 1 ? 1 : 2}`);
  L.push(`power    <- ${s.power}`);
  L.push(`mde      <- ${s.mde}`);
  const score = s.binary && s.binaryMethod !== 'legacy';
  if (s.binary) L.push(`p0       <- ${s.p0}`);
  if (score) {
    L.push(`p1       <- p0 ${s.binaryDir === 'decrease' ? '-' : '+'} mde        # implied treatment proportion`);
  } else if (s.binary) {
    L.push(`p1       <- p0 ${s.binaryDir === 'decrease' ? '-' : '+'} mde        # implied treatment proportion`);
    L.push('variance <- p0 * (1 - p0)                 # legacy: baseline variance in both arms');
  } else {
    L.push(`sd       <- ${s.sd}`);
    L.push('variance <- sd^2');
  }
  L.push(`r2       <- ${s.r2 || 0}`);
  if (!score) L.push('variance <- variance * (1 - r2)');
  L.push(`prop     <- ${s.prop}`);
  L.push(`arms     <- ${s.arms || 1}; outcomes <- ${s.outcomes || 1}`);
  L.push(`takeup   <- ${s.tut} - ${s.tuc}`);
  L.push(`attr     <- ${s.attr}`);
  if (s.clustered) {
    L.push(`icc      <- ${s.icc}`);
    L.push(`cv       <- ${s.cv || 0}`);
    L.push(`cattr    <- ${s.clusterAttr || 0}          # share of clusters lost entirely`);
  }
  L.push('');
  L.push('m_tests   <- arms * outcomes');
  const alphaExpr = s.correction === 'sidak' ? '1 - (1 - alpha)^(1/m_tests)'
    : s.correction === 'bonferroni' ? 'alpha / m_tests'
    : s.correction === 'effective' ? `alpha / (1 + (m_tests - 1) * (1 - ${s.testCorr || 0}))`
    : 'alpha';
  L.push(`alpha_adj <- ${alphaExpr}`);
  L.push('');
  // Both branches expose the same two hooks, so the solve code below never has to know which
  // one it got: n0_for turns a pair of quantiles into an analysed-n requirement, and z_power
  // turns a realised design into the standard normal / t deviate whose CDF is the power.
  // Both read the CURRENT `mde`, which matters because the MDE search reassigns it.
  if (score) {
    L.push('# Two-proportion score test. The significance term uses the variance POOLED under the');
    L.push('# null, the power term the UNPOOLED variance under the alternative, so the two quantiles');
    L.push('# cannot be folded into one quantity times (q_alpha + q_power)^2 and are carried apart.');
    L.push('# Averaging the two arm variances instead is the common shortcut and misses by up to 20%.');
    L.push(`P     <- ${(s.arms || 1) > 1 ? '0.5' : 'prop'}${(s.arms || 1) > 1 ? '                           # arms are equal-sized pairwise' : '                          # treated share'}`);
    L.push(`scale <- (1 - r2)${(s.arms || 1) > 1 ? ' * (arms + 1) / 2' : ''}`);
    L.push('vpair <- function() {                     # (pooled, unpooled) variance at the current mde');
    L.push(`  p1   <- p0 ${s.binaryDir === 'decrease' ? '-' : '+'} mde`);
    L.push('  pbar <- P * p1 + (1 - P) * p0');
    L.push('  c((1/P + 1/(1 - P)) * pbar * (1 - pbar) * scale,');
    L.push('    (p1 * (1 - p1) / P + p0 * (1 - p0) / (1 - P)) * scale)');
    L.push('}');
    L.push('n0_for  <- function(qa, qb) { v <- vpair()');
    L.push('  (qa * sqrt(v[1]) + qb * sqrt(v[2]))^2 / (mde^2 * takeup^2) }');
    L.push('power_each <- function(n_eff, crit, df) { v <- vpair()');
    L.push('  z <- (mde * takeup * sqrt(n_eff) - crit * sqrt(v[1])) / sqrt(v[2])');
    L.push('  if (df > 0) pt(z, df) else pnorm(z) }');
  } else {
    L.push(`alloc   <- ${(s.arms || 1) > 1 ? `2 * (arms + 1)` : '1 / (prop * (1 - prop))'}`);
    L.push('unit_at <- function() variance * alloc / mde^2 / takeup^2  # analysed n per (q_a + q_b)^2');
    L.push('n0_for  <- function(qa, qb) (qa + qb)^2 * unit_at()');
    L.push('# Exact noncentral t, not a central t shifted by the noncentrality.');
    L.push('power_each <- function(n_eff, crit, df) { ncp <- sqrt(n_eff / unit_at())');
    L.push('  if (df > 0) pt(crit, df, ncp, lower.tail = FALSE) else pnorm(ncp - crit) }');
  }
  if (s.clustered) {
    L.push('');
    L.push(s.cvMethod === 'efficient'
      ? 'deff <- function(ma) { lam <- icc*ma/(icc*ma + 1 - icc)\n' +
        '  (1 + (ma - 1) * icc) / (1 - lam * (1 - lam) * cv^2) }   # efficient mixed-effects'
      : 'deff <- function(ma) 1 + ((1 + cv^2) * ma - 1) * icc      # conservative');
  }
  return L;
}

/* Joint power over correlated tests, when the target is "any" or "all". */
function rJoint(s) {
  const rArm = (s.arms || 1) > 1 ? 0.5 : 0;
  const r = 1 - (1 - rArm) * (1 - (s.testCorr || 0));
  return [
    '',
    `r_tests <- ${(+r.toPrecision(6))}   # arms share a control group; outcomes share people`,
    'joint <- function(p_each, crit) {',
    '  if (m_tests <= 1) return(p_each)',
    '  ncp <- crit + qnorm(pmin(pmax(p_each, 1e-9), 1 - 1e-9))',
    '  u <- -6 + 12 * ((0:95) + 0.5) / 96; w <- dnorm(u) * (12/96)',
    '  p <- pnorm((ncp + sqrt(r_tests) * u - crit) / sqrt(1 - r_tests))',
    `  ${s.powerDef === 'all' ? 'sum(w * p^m_tests)' : '1 - sum(w * (1 - p)^m_tests)'}`,
    '}',
    '# per-comparison power that delivers the joint target',
    'crit0 <- qnorm(1 - alpha_adj/sided); lo <- 1e-6; hi <- 1 - 1e-9',
    'for (i in 1:60) { mid <- (lo + hi)/2; if (joint(mid, crit0) < power) lo <- mid else hi <- mid }',
    'power_each <- hi'
  ];
}

function rCode(s, r) {
  const bad = unsupportedFor(s, 'r');
  if (bad.length) return `# Code generation is not supported for this configuration yet (${bad.join('; ')}).\n# The calculator's result on screen remains correct; this section will support it in a later version.`;
  const L = ['# Power calculation reproduced from the Power Calculator',
             `# Solving for: ${r.mode === 'n' ? 'sample size' : r.mode === 'mde' ? 'minimum detectable effect' : 'power'}`,
             ''];
  L.push(...rPreamble(s));
  const joint = comparisons(s) > 1 && s.powerDef !== 'each';
  if (joint) L.push(...rJoint(s));
  const pwrTerm = joint ? 'power_each' : 'power';
  L.push('');

  // achieved power of a realised design — needed by two of the three modes
  L.push('power_of <- function(n_total, clusters = NA, m_units = NA) {');
  if (s.clustered) {
    L.push('  analysed <- clusters * (1 - cattr) * m_units * (1 - attr)');
    L.push('  d <- deff(m_units * (1 - attr)); df <- clusters * (1 - cattr) - 2');
  } else {
    L.push('  analysed <- n_total * (1 - attr); d <- 1; df <- analysed - 2');
  }
  L.push('  crit <- if (df > 0) qt(1 - alpha_adj/sided, df) else qnorm(1 - alpha_adj/sided)');
  L.push('  each <- power_each(analysed / d, crit, df)');
  L.push(joint ? '  joint(each, qnorm(1 - alpha_adj/sided))' : '  each');
  L.push('}');
  L.push('');

  if (r.mode === 'power') {
    if (s.clustered) L.push(`power_of(NA, clusters = ${r.clusters}, m_units = ${r.m})`);
    else L.push(`power_of(${r.n})`);
    return L.join('\n');
  }

  // solve for sample size (also the inner loop of the MDE search)
  L.push('required <- function() {');
  if (!s.clustered) {
    L.push('  n <- 4');
    L.push('  for (i in 1:80) { df <- max(1, n * (1 - attr) - 2)');
    L.push(`    n <- n0_for(qt(1 - alpha_adj/sided, df), qt(${pwrTerm}, df)) / (1 - attr) }`);
    L.push('  n_exact <- n');
    L.push('  n <- max(2, ceiling(n))');
    L.push('  step <- if (arms > 1) arms + 1 else 1');
    L.push('  if (arms > 1) n <- ceiling(n / (arms + 1)) * (arms + 1)');
    L.push('  if (arms == 1 && prop != 0.5) n <- ceiling(n_exact * prop) + ceiling(n_exact * (1 - prop))');
    L.push('  while (power_of(n) < power) n <- n + step        # integer-feasible allocation');
    L.push('  while (n - step >= 2 && power_of(n - step) >= power) n <- n - step   # smallest feasible');
    L.push('  n');
  } else if (s.cmode === 'units') {
    L.push(`  m_units <- ${s.m}; ma <- m_units * (1 - attr); K <- 4`);
    L.push('  for (i in 1:80) { df <- max(1, K * (1 - cattr) - 2)');
    L.push(`    n0 <- n0_for(qt(1 - alpha_adj/sided, df), qt(${pwrTerm}, df))`);
    L.push('    K <- (n0 * deff(ma) / ma) / (1 - cattr) }');
    L.push('  step <- if (arms > 1) arms + 1 else 2');
    L.push('  K <- ceiling(max(2, K) / step) * step');
    L.push('  while (power_of(NA, K, m_units) < power) K <- K + step');
    L.push('  while (K - step >= 2 && power_of(NA, K - step, m_units) >= power) K <- K - step');
    L.push('  K * m_units');
  } else {
    L.push(`  K <- ${s.m}; Ka <- K * (1 - cattr)`);
    L.push('  n0 <- n0_for(qt(1 - alpha_adj/sided, Ka - 2), qt(' + pwrTerm + ', Ka - 2))');
    L.push('  # The conservative design effect inverts cleanly; the efficient one does not.');
    L.push('  # Setting cv = 0 gives a lower bound under either method, so it seeds the search');
    L.push('  # and the loop walks up to the smallest cluster size that reaches target power.');
    L.push('  ma <- n0 * (1 - icc) / (Ka - n0 * icc)');
    L.push('  m_units <- max(2, ceiling(ma / (1 - attr)))');
    L.push('  while (power_of(NA, K, m_units) < power && m_units < 1e6) m_units <- m_units + 1');
    L.push('  if (m_units >= 1e6) stop("no cluster size reaches target power with ", K, " clusters")');
    L.push('  while (m_units > 2 && power_of(NA, K, m_units - 1) >= power) m_units <- m_units - 1');
    L.push('  K * m_units');
  }
  L.push('}');
  L.push('');
  if (r.mode === 'n') { L.push('required()   # total sample size'); return L.join('\n'); }

  // solve for MDE: invert the requirement on the sample actually available
  L.push(`target_n <- ${r.n}`);
  L.push('mde_for <- function(target) {');
  L.push(`  lo <- 1e-9; hi <- ${s.binary ? ((s.binaryDir === 'decrease' ? s.p0 : 1 - s.p0) - 0.001).toPrecision(6) : Math.max(1, s.mde * 1e3)}`);
  L.push('  for (i in 1:80) { mid <- sqrt(lo * hi)');
  L.push('    mde <<- mid; n_mid <- try(required(), silent = TRUE)');
  L.push('    if (inherits(n_mid, "try-error") || n_mid > target) lo <- mid else hi <- mid }');
  L.push('  hi');
  L.push('}');
  L.push('mde_for(target_n)   # smallest detectable effect at that sample');
  return L.join('\n');
}

function stataCode(s, r) {
  const bad = unsupportedFor(s, 'stata');
  if (bad.length) return `* Code generation is not supported for this configuration yet (${bad.join('; ')}).\n* Use the R version, which covers it, or the result shown on the Calculate tab.`;
  const L = ['* Power calculation reproduced from the Power Calculator',
             `* Solving for: ${r.mode === 'n' ? 'sample size' : r.mode === 'mde' ? 'minimum detectable effect' : 'power'}`];
  L.push(`scalar alpha = ${s.alpha}`);
  L.push(`scalar sided = ${s.sided === 1 ? 1 : 2}`);
  L.push(`scalar power = ${s.power}`);
  L.push(`scalar mde   = ${s.mde}`);
  const score = s.binary && s.binaryMethod !== 'legacy';
  if (s.binary) {
    L.push(`scalar p0 = ${s.p0}`);
    L.push(`scalar p1 = p0 ${s.binaryDir === 'decrease' ? '-' : '+'} mde`);
  }
  if (!score) {
    if (!s.binary) L.push(`scalar sd = ${s.sd}`);
    L.push(s.binary ? 'scalar variance = p0 * (1 - p0)' : 'scalar variance = sd^2');
    L.push(`scalar variance = variance * (1 - ${s.r2 || 0})`);
  }
  L.push(`scalar prop = ${s.prop}`);
  L.push(`scalar arms = ${s.arms || 1}`);
  L.push(`scalar m_tests = ${(s.arms || 1) * (s.outcomes || 1)}`);
  L.push(`scalar takeup = ${s.tut} - ${s.tuc}`);
  L.push(`scalar attr = ${s.attr}`);
  if (s.clustered) {
    L.push(`scalar icc = ${s.icc}`); L.push(`scalar cv = ${s.cv || 0}`);
    L.push(`scalar cattr = ${s.clusterAttr || 0}`);
  }
  L.push(`scalar alpha_adj = ${s.correction === 'sidak' ? '1 - (1 - alpha)^(1/m_tests)'
    : s.correction === 'bonferroni' ? 'alpha / m_tests'
    : s.correction === 'effective' ? `alpha / (1 + (m_tests - 1) * (1 - ${s.testCorr || 0}))` : 'alpha'}`);
  // The score test cannot be folded into one `unit` times (q_alpha + q_power)^2: the
  // significance term uses the variance pooled under the null and the power term the unpooled
  // variance under the alternative. So the two quantiles are carried separately, exactly as in
  // the calculator. N0() and ZPOW() below emit whichever form this design needs, and the solve
  // blocks are written once against them.
  if (score) {
    L.push(`scalar P     = ${(s.arms || 1) > 1 ? '0.5' : 'prop'}`);
    L.push(`scalar scale = (1 - ${s.r2 || 0})${(s.arms || 1) > 1 ? ' * (arms + 1) / 2' : ''}`);
    L.push('scalar pbar  = P * p1 + (1 - P) * p0');
    L.push('scalar c0    = (1/P + 1/(1 - P)) * pbar * (1 - pbar) * scale    // pooled, under H0');
    L.push('scalar c1    = (p1 * (1 - p1) / P + p0 * (1 - p0) / (1 - P)) * scale  // unpooled, under H1');
  } else {
    L.push(`scalar alloc = ${(s.arms || 1) > 1 ? `2 * (arms + 1)` : '1 / (prop * (1 - prop))'}`);
    L.push('scalar unit = variance * alloc / mde^2 / takeup^2');
  }
  const N0 = (qa, qb) => score
    ? `(${qa} * sqrt(c0) + ${qb} * sqrt(c1))^2 / (mde^2 * takeup^2)`
    : `(${qa} + ${qb})^2 * unit`;
  // t and normal are symmetric, so 1 - F(crit - ncp) is F(ncp - crit); one form covers both
  // Stata's nt(df, np, x) is the noncentral t CDF, matching the calculator exactly. The score
  // branch is a two-variance z/t statistic, where noncentral t does not apply.
  const PEACH = nEff => score
    ? `t(df, (mde * takeup * sqrt(${nEff}) - crit * sqrt(c0)) / sqrt(c1))`
    : `1 - nt(df, sqrt((${nEff}) / unit), crit)`;
  L.push('');
  const deff = s.cvMethod === 'efficient'
    ? '(1 + (ma - 1) * icc) / (1 - (icc*ma/(icc*ma + 1 - icc)) * (1 - icc*ma/(icc*ma + 1 - icc)) * cv^2)'
    : '1 + ((1 + cv^2) * ma - 1) * icc';
  if (r.mode === 'power') {
    if (s.clustered) {
      L.push(`scalar K = ${r.clusters}`); L.push(`scalar m_units = ${r.m}`);
      L.push('scalar ma = m_units * (1 - attr)');
      L.push(`scalar d = ${deff}`);
      L.push('scalar analysed = K * (1 - cattr) * m_units * (1 - attr)');
      L.push('scalar df = K * (1 - cattr) - 2');
    } else {
      L.push(`scalar analysed = ${r.n} * (1 - attr)`); L.push('scalar d = 1');
      L.push('scalar df = analysed - 2');
    }
    L.push('scalar crit = invt(df, 1 - alpha_adj/sided)');
    L.push(`display "power = " ${PEACH('analysed / d')}`);
    return L.join('\n');
  }
  if (!s.clustered) {
    L.push('scalar n = 4');
    L.push('forvalues i = 1/80 {');
    L.push('    scalar df = max(1, n * (1 - attr) - 2)');
    L.push(`    scalar n  = ${N0('invt(df, 1 - alpha_adj/sided)', 'invt(df, power)')} / (1 - attr)`);
    L.push('}');
    L.push('scalar n_exact = n');
    L.push('scalar n = max(2, ceil(n))');
    L.push('if arms > 1 scalar n = ceil(n / (arms + 1)) * (arms + 1)');
    L.push('if arms == 1 & prop != 0.5 scalar n = ceil(n_exact * prop) + ceil(n_exact * (1 - prop))');
    L.push('display "required total sample size = " n');
  } else if (s.cmode === 'units') {
    L.push(`scalar m_units = ${s.m}`);
    L.push('scalar ma = m_units * (1 - attr)');
    L.push(`scalar d = ${deff}`);
    L.push('scalar K = 4');
    L.push('forvalues i = 1/80 {');
    L.push('    scalar df = max(1, K * (1 - cattr) - 2)');
    L.push(`    scalar n0 = ${N0('invt(df, 1 - alpha_adj/sided)', 'invt(df, power)')}`);
    L.push('    scalar K  = (n0 * d / ma) / (1 - cattr)');
    L.push('}');
    L.push('scalar step = cond(arms > 1, arms + 1, 2)');
    L.push('scalar K = ceil(max(2, K) / step) * step');
    L.push('display "clusters = " K "  cluster size = " m_units "  total = " K * m_units');
  } else {
    L.push(`scalar K = ${s.m}`);
    L.push('scalar Ka = K * (1 - cattr)');
    L.push(`scalar n0 = ${N0('invt(Ka - 2, 1 - alpha_adj/sided)', 'invt(Ka - 2, power)')}`);
    // cv = 0 is a lower bound on the required cluster size under either CV method; the loop
    // then walks up to the smallest size that actually reaches the target power, recomputing
    // the design effect each step. The closed form alone is only correct for the conservative
    // method, and it was being emitted for both.
    L.push('scalar ma = n0 * (1 - icc) / max(1e-9, Ka - n0 * icc)');
    L.push('scalar m_units = max(2, ceil(ma / (1 - attr)))');
    L.push('scalar crit = invt(Ka - 2, 1 - alpha_adj/sided)');
    L.push('scalar reached = 0');
    L.push('while reached == 0 & m_units < 1000000 {');
    L.push('    scalar ma  = m_units * (1 - attr)');
    L.push(`    scalar d   = ${deff}`);
    L.push('    scalar df  = Ka - 2');
    L.push(`    scalar pw  = ${PEACH('K * (1 - cattr) * ma / d')}`);
    L.push('    if pw >= power {');
    L.push('        scalar reached = 1');
    L.push('    }');
    L.push('    else {');
    L.push('        scalar m_units = m_units + 1');
    L.push('    }');
    L.push('}');
    L.push('display "clusters = " K "  cluster size = " m_units "  total = " K * m_units');
  }
  if (r.mode === 'mde') L.push('* For MDE, re-run this block over a bisection on mde, or use the R version.');
  return L.join('\n');
}


return {solve,requiredSample,achievedPower,mdeForSampleSize,pricesFrom,budgetAnswer,costOf,optimalClusterSize,clusterSizeAdvice,methodsParagraph,rCode,stataCode,unsupportedFor};
}
