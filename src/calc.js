import { RULES, CHANNELS } from "./constants";

export function getRate(p, currencies) {
  if (p.useManual && parseFloat(p.manualRate) > 0) return parseFloat(p.manualRate);
  return currencies.find(c => c.code === p.currency)?.rate || 1;
}

export function calcShares(p, currencies) {
  const rate     = getRate(p, currencies);
  const totalBDT = (parseFloat(p.totalBudget) || 0) * rate;
  const taxAmt   = totalBDT * ((parseFloat(p.tax) || 0) / 100);
  const net      = totalBDT - taxAmt;
  const wBDT     = p.workerType === "external" ? (parseFloat(p.workerBudget) || 0) * rate : 0;
  const dist     = Math.max(0, net - wBDT);
  const rule     = RULES.find(r => r.id === (p.rule || "DEFAULT")) || RULES[0];
  let sP, rP;
  if      (p.workerType === "ceo_sumaiya") { sP = rule.w; rP = rule.o; }
  else if (p.workerType === "ceo_rakib")   { rP = rule.w; sP = rule.o; }
  else if (p.rule === "HIRE55")            { sP = 50;     rP = 50; }
  else {
    const recv = p.paymentReceiver === "sumaiya";
    sP = recv ? rule.w : rule.o;
    rP = recv ? rule.o : rule.w;
  }
  return { rate, totalBDT, taxAmt, net, wBDT, dist,
    sShare: dist * sP / 100, rShare: dist * rP / 100, sP, rP };
}

export function chOwner(ch) {
  if (CHANNELS.sumaiya.includes(ch)) return "sumaiya";
  if (CHANNELS.rakib.includes(ch))   return "rakib";
  return null;
}

/**
 * calcDebt — net settlement between CEOs.
 * settledBaseline: snapshot of raw totals at last settlement.
 * Subtracted from current totals so past-settled debt never reappears.
 */
export function calcDebt(projects, currencies, expenses = [], settledBaseline = null) {
  let sumaiyaOwesRakib = 0, rakibOwesSumaiya = 0;

  projects.forEach(p => {
    const { sShare, rShare } = calcShares(p, currencies);
    const recv = chOwner(p.paymentChannel);
    if      (recv === "sumaiya") sumaiyaOwesRakib += rShare;
    else if (recv === "rakib")   rakibOwesSumaiya += sShare;
  });

  let expSumaiyaCredit = 0, expRakibCredit = 0;
  expenses.filter(e => e.linkedToSettlement).forEach(e => {
    const amt = e.amountBDT || 0;
    if (e.paidBy === "Sumaiya") {
      expSumaiyaCredit += amt / 2;
    } else if (e.paidBy === "Rakib") {
      expRakibCredit += amt / 2;
    } else if (e.paidBy === "Company (Joint)") {
      const sAmt = e.amountSumaiya || 0;
      const rAmt = e.amountRakib   || 0;
      if (sAmt > 0 || rAmt > 0) {
        const half = (sAmt + rAmt) / 2;
        if (sAmt > half) expSumaiyaCredit += (sAmt - half);
        if (rAmt > half) expRakibCredit   += (rAmt - half);
      }
    }
  });
  rakibOwesSumaiya += expSumaiyaCredit;
  sumaiyaOwesRakib += expRakibCredit;

  // Subtract settled baseline so amounts paid in past don't reappear
  const adjS = Math.max(0, sumaiyaOwesRakib - (settledBaseline?.sumaiyaOwesRakib || 0));
  const adjR = Math.max(0, rakibOwesSumaiya  - (settledBaseline?.rakibOwesSumaiya  || 0));

  const net = adjS - adjR;
  const raw = { sumaiyaOwesRakib, rakibOwesSumaiya, expSumaiyaCredit, expRakibCredit };
  if (net >  0.01) return { payer:"sumaiya", payerLabel:"Sumaiya", receiver:"rakib",   receiverLabel:"Rakib",   amount:net,          raw };
  if (net < -0.01) return { payer:"rakib",   payerLabel:"Rakib",   receiver:"sumaiya", receiverLabel:"Sumaiya", amount:Math.abs(net), raw };
  return { payer:null, amount:0, raw };
}
