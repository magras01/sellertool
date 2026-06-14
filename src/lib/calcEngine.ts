export interface CalcInputs {
  cogs: number
  defect: number
  returnFee: number
  platform: number
  affiliate: number
  tax: number
  adSpend: number
  packaging: number
  labor: number
  monthlyLabor: number
  price: number
  units: number
  payoutWeeks: number
  addlTotal: number
}

export interface CalcResults {
  prodCost: number
  wastePerItem: number
  adPerUnit: number
  monthlyLaborPerUnit: number
  platFee: number
  affFee: number
  taxFee: number
  netRev: number
  profit: number
  margin: number
  bep: number
  suggested: number
  monthlyProfit: number
  monthlyRev: number
  monthlyCogs: number
  monthlyOverhd: number
  monthlyInvest: number
  capitalNeeded: number
  roi: number
}

export function computeCalc(i: CalcInputs): CalcResults {
  const defectRate = i.defect / 100
  const platform = i.platform / 100
  const affiliate = i.affiliate / 100
  const tax = i.tax / 100

  const adPerUnit = i.units > 0 ? i.adSpend / i.units : 0
  const monthlyLaborPerUnit = i.units > 0 ? i.monthlyLabor / i.units : 0
  const wastePerItem = i.cogs * defectRate / Math.max(1 - defectRate, 0.01)
  const returnFeeCost = defectRate * i.returnFee
  const prodCost = i.cogs + wastePerItem + returnFeeCost + i.packaging + i.labor + monthlyLaborPerUnit + adPerUnit + i.addlTotal

  const platFee = i.price * platform
  const affFee = i.price * affiliate
  const taxFee = i.price * tax
  const netRev = i.price - platFee - affFee - taxFee
  const profit = netRev - prodCost
  const margin = i.price > 0 ? profit / i.price : 0
  const bep = prodCost / Math.max(1 - platform - affiliate - tax, 0.01)
  const suggested = prodCost * 3

  const monthlyProfit = profit * i.units
  const monthlyRev = i.price * i.units
  const monthlyCogs = (i.cogs + wastePerItem) * i.units
  const monthlyOverhd = (i.packaging + i.labor + monthlyLaborPerUnit + adPerUnit + platFee + affFee + taxFee) * i.units
  const monthlyInvest = prodCost * i.units
  const roi = monthlyInvest > 0 ? monthlyProfit / monthlyInvest * 100 : 0
  const capitalNeeded = prodCost * i.units * (i.payoutWeeks * 7 / 30)

  return { prodCost, wastePerItem, adPerUnit, monthlyLaborPerUnit, platFee, affFee, taxFee, netRev, profit, margin, bep, suggested, monthlyProfit, monthlyRev, monthlyCogs, monthlyOverhd, monthlyInvest, capitalNeeded, roi }
}

export function computeQuick(cogs: number, price: number, platform: number, affiliate: number, tax: number) {
  const feeRate = (platform + affiliate + tax) / 100
  const payout = price * (1 - feeRate)
  const profit = payout - cogs
  const margin = price > 0 ? profit / price : 0
  const bep = cogs / Math.max(1 - feeRate, 0.01)
  return { payout, profit, margin, bep }
}

export function fmt(v: number, sym: string) {
  return sym + Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function n(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}
