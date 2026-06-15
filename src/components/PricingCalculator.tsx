'use client'

import { useState, useEffect, useCallback } from 'react'
import { computeCalc, computeQuick, fmt, n, CalcInputs } from '@/lib/calcEngine'

// ── Types ──────────────────────────────────────────────────────────
interface Additional { id: number; name: string; cost: number }
interface SavedProduct {
  name: string; cogs: string; defect: number; platform: number; affiliate: number
  tax: number; adSpend: string; packaging: string; labor: string; monthlyLabor: string
  returnFee: string; price: string; units: string; payoutWeeks: number
  currency: string; savedAt: string
  addlSnapshot?: { name: string; cost: number }[]
}
interface CustomPreset { id: number; name: string; platform: number; affiliate: number; tax: number; price: number }

const PRESETS: Record<string, { platform: number; affiliate: number; tax: number }> = {
  shopee:    { platform: 25, affiliate: 0,  tax: 0 },
  lazada:    { platform: 22, affiliate: 5,  tax: 0 },
  tiktok:    { platform: 8,  affiliate: 10, tax: 0 },
  wholesale: { platform: 0,  affiliate: 0,  tax: 0 },
}

const CURRENCIES = ['$','€','£','₱','RM','S$','₹','¥','A$','C$']

let _affOpened = false

export default function PricingCalculator() {
  // ── Mode & UI ──────────────────────────────────────────────────
  const [mode, setModeState] = useState<'quick'|'advanced'>('quick')
  const [dark, setDark] = useState(false)
  const [currency, setCurrency] = useState('₱')
  const [helpLang, setHelpLang] = useState<'en'|'tl'>('en')
  const [breakdownMode, setBreakdownMode] = useState<'item'|'monthly'>('item')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['sec-addl','sec-fees','sec-overhead','sec-goal','sec-voucher','sec-ads','sec-pricetable']))
  const [toast, setToast] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [editPresetId, setEditPresetId] = useState<number|null>(null)
  const [qFeesOpen, setQFeesOpen] = useState(false)

  // ── Quick mode ────────────────────────────────────────────────
  const [qName, setQName] = useState('')
  const [qCogs, setQCogs] = useState('')
  const [qPrice, setQPrice] = useState('')
  const [qPlatform, setQPlatform] = useState(0)
  const [qAffiliate, setQAffiliate] = useState(0)
  const [qTax, setQTax] = useState(0)
  const [qTarget, setQTarget] = useState('')
  const [activeQuick, setActiveQuick] = useState<string|null>(null)
  const [quickSaved, setQuickSaved] = useState<Record<string,any>>({})

  // ── Advanced mode ─────────────────────────────────────────────
  const [name, setName] = useState('')
  const [cogs, setCogs] = useState('')
  const [defect, setDefect] = useState(0)
  const [returnFee, setReturnFee] = useState('')
  const [platform, setPlatform] = useState(0)
  const [affiliate, setAffiliate] = useState(0)
  const [tax, setTax] = useState(0)
  const [adSpend, setAdSpend] = useState('')
  const [packaging, setPackaging] = useState('')
  const [labor, setLabor] = useState('')
  const [monthlyLabor, setMonthlyLabor] = useState('')
  const [price, setPrice] = useState('')
  const [units, setUnits] = useState('')
  const [payoutWeeks, setPayoutWeeks] = useState(3)
  const [targetProfit, setTargetProfit] = useState('')
  const [targetLocked, setTargetLocked] = useState(false)
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [addlId, setAddlId] = useState(0)
  const [savedProducts, setSavedProducts] = useState<Record<string,SavedProduct>>({})
  const [activeProduct, setActiveProduct] = useState<string|null>(null)
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [cpm, setCpm] = useState({ name:'', platform:'', affiliate:'', tax:'', price:'' })

  // ── Price comparison ──────────────────────────────────────────
  const [pricePoints, setPricePoints] = useState<number[]>([])
  const [ptInput, setPtInput] = useState('')

  // ── Voucher & Ads ─────────────────────────────────────────────
  const [vType, setVType] = useState<'percent'|'fixed'>('percent')
  const [vValue, setVValue] = useState('')
  const [adsBudget, setAdsBudget] = useState('')
  const [adsCpc, setAdsCpc] = useState('')
  const [adsCvr, setAdsCvr] = useState('')
  const [goalProfit, setGoalProfit] = useState('')

  // ── Init from localStorage ────────────────────────────────────
  useEffect(() => {
    const dark = localStorage.getItem('seller_dark_mode') === '1'
    setDark(dark)
    const m = localStorage.getItem('seller_mode')
    if (m === 'advanced') setModeState('advanced')
    try { setQuickSaved(JSON.parse(localStorage.getItem('seller_quick_products') || '{}')) } catch {}
    try { setSavedProducts(JSON.parse(localStorage.getItem('seller_products') || '{}')) } catch {}
    try { setCustomPresets(JSON.parse(localStorage.getItem('seller_custom_presets') || '[]')) } catch {}
  }, [])

  // ── Toast ─────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  // ── Affiliate link ────────────────────────────────────────────
  const maybeOpenAffiliate = () => {
    const link = '' // empty for now
    if (!link || _affOpened) return
    _affOpened = true
    window.open(link, '_blank', 'noopener')
  }

  // ── Helpers ───────────────────────────────────────────────────
  const f = (v: number) => fmt(v, currency)
  const addlTotal = additionals.reduce((s, a) => s + a.cost, 0)

  const getInputs = (): CalcInputs => ({
    cogs: n(cogs), defect, returnFee: n(returnFee),
    platform, affiliate, tax,
    adSpend: n(adSpend), packaging: n(packaging),
    labor: n(labor), monthlyLabor: n(monthlyLabor),
    price: n(price), units: n(units), payoutWeeks, addlTotal,
  })

  const r = computeCalc(getInputs())

  // ── Target profit price ───────────────────────────────────────
  const getTargetPrice = () => {
    const tp = n(targetProfit)
    if (!tp) return null
    const i = getInputs()
    const denom = Math.max(1 - (i.platform + i.affiliate + i.tax) / 100, 0.01)
    return (r.prodCost + tp) / denom
  }
  const targetPrice = getTargetPrice()

  // If locked, override price
  const effectivePrice = (() => {
    if (targetLocked && targetPrice) return targetPrice
    return n(price)
  })()

  const rLocked = targetLocked && targetPrice
    ? computeCalc({ ...getInputs(), price: targetPrice! })
    : r

  // ── Quick calc ────────────────────────────────────────────────
  const qr = computeQuick(n(qCogs), n(qPrice), qPlatform, qAffiliate, qTax)
  const qSuggestedPrice = (() => {
    const tp = n(qTarget)
    if (!tp) return null
    const feeRate = (qPlatform + qAffiliate + qTax) / 100
    return (n(qCogs) + tp) / Math.max(1 - feeRate, 0.01)
  })()

  // ── Section toggle ────────────────────────────────────────────
  const toggleSection = (id: string) => {
    const next = new Set(collapsed)
    if (next.has(id)) { next.delete(id); maybeOpenAffiliate() }
    else next.add(id)
    setCollapsed(next)
  }
  const isOpen = (id: string) => !collapsed.has(id)

  // ── Mode switch ───────────────────────────────────────────────
  const setMode = (m: 'quick'|'advanced') => {
    setModeState(m)
    localStorage.setItem('seller_mode', m)
    _affOpened = false
  }

  // ── Dark mode ─────────────────────────────────────────────────
  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('seller_dark_mode', next ? '1' : '0')
  }

  // ── Preset apply ─────────────────────────────────────────────
  const applyPreset = (key: string) => {
    const p = PRESETS[key]
    if (!p) return
    setPlatform(p.platform); setAffiliate(p.affiliate); setTax(p.tax)
  }

  // ── Additional costs ──────────────────────────────────────────
  const addAdditional = () => {
    const id = addlId + 1
    setAddlId(id)
    setAdditionals(prev => [...prev, { id, name: '', cost: 0 }])
  }
  const updateAdditional = (id: number, field: 'name'|'cost', val: string|number) => {
    setAdditionals(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))
  }
  const removeAdditional = (id: number) => setAdditionals(prev => prev.filter(a => a.id !== id))

  // ── Save/load products (advanced) ─────────────────────────────
  const openSaveModal = () => { setSaveName(name); setSaveModalOpen(true) }
  const confirmSave = () => {
    const n2 = saveName.trim()
    if (!n2) return
    const entry: SavedProduct = {
      name: n2, cogs, defect, platform, affiliate, tax, adSpend, packaging,
      labor, monthlyLabor, returnFee, price, units, payoutWeeks, currency,
      savedAt: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
      addlSnapshot: additionals.map(a => ({ name: a.name, cost: a.cost })),
    }
    const next = { ...savedProducts, [n2]: entry }
    setSavedProducts(next)
    localStorage.setItem('seller_products', JSON.stringify(next))
    setSaveModalOpen(false)
    setActiveProduct(n2)
    showToast(`"${n2}" saved!`)
  }
  const loadProduct = (key: string) => {
    const s = savedProducts[key]
    if (!s) return
    setName(s.name || ''); setCogs(s.cogs || ''); setDefect(s.defect || 0)
    setPlatform(s.platform || 0); setAffiliate(s.affiliate || 0); setTax(s.tax || 0)
    setAdSpend(s.adSpend || ''); setPackaging(s.packaging || ''); setLabor(s.labor || '')
    setMonthlyLabor(s.monthlyLabor || ''); setReturnFee(s.returnFee || '')
    setPrice(s.price || ''); setUnits(s.units || ''); setPayoutWeeks(s.payoutWeeks || 3)
    if (s.currency) setCurrency(s.currency)
    setAdditionals((s.addlSnapshot || []).map((a, i) => ({ id: i + 1, ...a })))
    setActiveProduct(key)
    showToast(`"${key}" loaded!`)
  }
  const deleteProduct = (key: string) => {
    const next = { ...savedProducts }
    delete next[key]
    setSavedProducts(next)
    localStorage.setItem('seller_products', JSON.stringify(next))
    if (activeProduct === key) setActiveProduct(null)
  }
  const updateProduct = () => {
    if (!activeProduct) return
    const entry: SavedProduct = {
      name: name || activeProduct, cogs, defect, platform, affiliate, tax, adSpend,
      packaging, labor, monthlyLabor, returnFee, price, units, payoutWeeks, currency,
      savedAt: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
      addlSnapshot: additionals.map(a => ({ name: a.name, cost: a.cost })),
    }
    const newName = name.trim() || activeProduct
    const next = { ...savedProducts }
    if (newName !== activeProduct) delete next[activeProduct]
    next[newName] = entry
    setSavedProducts(next)
    localStorage.setItem('seller_products', JSON.stringify(next))
    setActiveProduct(newName)
    showToast(`"${newName}" updated!`)
  }

  // ── Save/load (quick) ─────────────────────────────────────────
  const saveQuick = () => {
    const n2 = qName.trim()
    if (!n2) { showToast('Enter a product name first'); return }
    const entry = { name: n2, cogs: qCogs, platform: qPlatform, affiliate: qAffiliate, tax: qTax, price: qPrice, target: qTarget, currency, savedAt: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) }
    const next = { ...quickSaved, [n2]: entry }
    setQuickSaved(next)
    localStorage.setItem('seller_quick_products', JSON.stringify(next))
    setActiveQuick(n2)
    showToast(`"${n2}" saved!`)
  }
  const loadQuick = (key: string) => {
    const s = quickSaved[key]
    if (!s) return
    setQName(s.name || ''); setQCogs(s.cogs || ''); setQPlatform(s.platform || 0)
    setQAffiliate(s.affiliate || 0); setQTax(s.tax || 0); setQPrice(s.price || '')
    setQTarget(s.target || ''); if (s.currency) setCurrency(s.currency)
    setActiveQuick(key); showToast(`"${key}" loaded!`)
  }
  const deleteQuick = (key: string) => {
    const next = { ...quickSaved }; delete next[key]
    setQuickSaved(next)
    localStorage.setItem('seller_quick_products', JSON.stringify(next))
    if (activeQuick === key) setActiveQuick(null)
  }

  // ── Custom presets ────────────────────────────────────────────
  const openPresetModal = (id: number|null = null) => {
    if (id !== null) {
      const p = customPresets.find(x => x.id === id)
      if (p) setCpm({ name: p.name, platform: String(p.platform), affiliate: String(p.affiliate), tax: String(p.tax), price: String(p.price || '') })
    } else {
      setCpm({ name:'', platform:'', affiliate:'', tax:'', price:'' })
    }
    setEditPresetId(id); setPresetModalOpen(true)
  }
  const confirmPreset = () => {
    if (!cpm.name.trim()) return
    const entry: CustomPreset = { id: editPresetId ?? Date.now(), name: cpm.name.trim(), platform: parseFloat(cpm.platform)||0, affiliate: parseFloat(cpm.affiliate)||0, tax: parseFloat(cpm.tax)||0, price: parseFloat(cpm.price)||0 }
    const next = editPresetId !== null
      ? customPresets.map(p => p.id === editPresetId ? entry : p)
      : [...customPresets, entry]
    setCustomPresets(next)
    localStorage.setItem('seller_custom_presets', JSON.stringify(next))
    setPresetModalOpen(false)
    showToast(`"${entry.name}" ${editPresetId !== null ? 'updated' : 'saved'}!`)
  }
  const applyCustomPreset = (id: number) => {
    const p = customPresets.find(x => x.id === id)
    if (!p) return
    setPlatform(p.platform); setAffiliate(p.affiliate); setTax(p.tax)
    if (p.price) setPrice(String(p.price))
  }
  const deletePreset = (id: number) => {
    const next = customPresets.filter(p => p.id !== id)
    setCustomPresets(next)
    localStorage.setItem('seller_custom_presets', JSON.stringify(next))
  }

  // ── Reset ─────────────────────────────────────────────────────
  const resetAdvanced = () => {
    setName(''); setCogs(''); setDefect(0); setPlatform(0); setAffiliate(0); setTax(0)
    setAdSpend(''); setPackaging(''); setLabor(''); setMonthlyLabor(''); setReturnFee('')
    setPrice(''); setUnits(''); setPayoutWeeks(3); setTargetProfit(''); setTargetLocked(false)
    setAdditionals([]); setActiveProduct(null)
  }
  const resetQuick = () => {
    setQName(''); setQCogs(''); setQPrice(''); setQPlatform(0); setQAffiliate(0); setQTax(0); setQTarget(''); setActiveQuick(null)
  }

  // ── Export ────────────────────────────────────────────────────
  const exportData = () => {
    if (typeof window === 'undefined') return
    const XLSX = (window as any).XLSX
    if (!XLSX) { showToast('Export library not loaded yet'); return }
    const fileName = (name || 'seller-pricing') + '.xlsx'
    const rows = [
      ['Online Seller Pricing Calculator',''],['Product', name || 'Untitled'],['',''],['INPUTS',''],
      ['Currency', currency], ['Cost per Unit (COGS)', n(cogs)], ['Monthly Ad Spend', n(adSpend)],
      ['Defect / Return Rate (%)', defect], ['Platform Fee (%)', platform],
      ['Affiliate Commission (%)', affiliate], ['Tax Rate (%)', tax],
      ['Packaging per Item', n(packaging)], ['Labor per Item', n(labor)],
      ['Monthly Labor Cost', n(monthlyLabor)], ['Return Fee per Item', n(returnFee)],
      ['Selling Price', n(price)], ['Monthly Units Target', n(units)],
      ['Payout Delay (weeks)', payoutWeeks], ['',''], ['ADDITIONAL COSTS',''],
      ['Name','Cost'], ...additionals.map(a => [a.name, a.cost]), ['',''], ['RESULTS',''],
      ['Cost per Unit', rLocked.prodCost.toFixed(2)],
      ['Break-even Price', rLocked.bep.toFixed(2)],
      ['Profit per Item', rLocked.profit.toFixed(2)],
      ['Profit Margin', (rLocked.margin * 100).toFixed(1) + '%'],
      ['Monthly Gross Profit', rLocked.monthlyProfit.toFixed(2)],
      ['Monthly Revenue', rLocked.monthlyRev.toFixed(2)],
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 32 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Pricing')
    XLSX.writeFile(wb, fileName)
  }

  // ── Import ────────────────────────────────────────────────────
  const importData = (file: File) => {
    const XLSX = (window as any).XLSX
    if (!XLSX) { showToast('Import library not loaded yet'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const map: Record<string, any> = {}
        rows.forEach((row: any[]) => { if (row[0] && row[1] !== '') map[String(row[0]).trim()] = row[1] })
        if (map['Product']) setName(map['Product'])
        if (map['Currency']) setCurrency(map['Currency'])
        if (map['Cost per Unit (COGS)'] !== undefined) setCogs(String(map['Cost per Unit (COGS)']))
        if (map['Monthly Ad Spend'] !== undefined) setAdSpend(String(map['Monthly Ad Spend']))
        if (map['Defect / Return Rate (%)'] !== undefined) setDefect(Number(map['Defect / Return Rate (%)']))
        if (map['Platform Fee (%)'] !== undefined) setPlatform(Number(map['Platform Fee (%)']))
        if (map['Affiliate Commission (%)'] !== undefined) setAffiliate(Number(map['Affiliate Commission (%)']))
        if (map['Tax Rate (%)'] !== undefined) setTax(Number(map['Tax Rate (%)']))
        if (map['Packaging per Item'] !== undefined) setPackaging(String(map['Packaging per Item']))
        if (map['Labor per Item'] !== undefined) setLabor(String(map['Labor per Item']))
        if (map['Monthly Labor Cost'] !== undefined) setMonthlyLabor(String(map['Monthly Labor Cost']))
        if (map['Return Fee per Item'] !== undefined) setReturnFee(String(map['Return Fee per Item']))
        if (map['Selling Price'] !== undefined) setPrice(String(map['Selling Price']))
        if (map['Monthly Units Target'] !== undefined) setUnits(String(map['Monthly Units Target']))
        if (map['Payout Delay (weeks)'] !== undefined) setPayoutWeeks(Number(map['Payout Delay (weeks)']))
        // Additional costs
        let inAddl = false; const addls: Additional[] = []
        rows.forEach((row: any[], idx: number) => {
          if (String(row[0]).trim() === 'Name' && String(row[1]).trim() === 'Cost') { inAddl = true; return }
          if (inAddl && row[0] && row[0] !== 'RESULTS') addls.push({ id: idx, name: String(row[0]), cost: Number(row[1]) || 0 })
          if (inAddl && !row[0] && !row[1]) inAddl = false
        })
        setAdditionals(addls)
        showToast('Import successful!')
      } catch { showToast('Import failed — check file format.') }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Price comparison ──────────────────────────────────────────
  const addPricePoint = () => {
    const v = parseFloat(ptInput)
    if (!v || v <= 0 || pricePoints.includes(v)) { setPtInput(''); return }
    setPricePoints(prev => [...prev, v].sort((a, b) => a - b))
    setPtInput('')
  }
  const calcRowData = (px: number) => {
    const i = getInputs()
    const pf = i.platform / 100; const af = i.affiliate / 100; const tf = i.tax / 100
    const platFee = px * pf; const affFee = px * af; const taxFee = px * tf
    const netRev = px - platFee - affFee - taxFee
    const profit = netRev - rLocked.prodCost
    const margin = px > 0 ? profit / px : 0
    const monthly = profit * i.units
    const bep = rLocked.bep
    return { netRev, profit, margin, monthly, bep, prodCost: rLocked.prodCost }
  }

  // ── Voucher calc ──────────────────────────────────────────────
  const vCalc = (() => {
    const dv = parseFloat(vValue) || 0
    const px = n(price); const u = n(units)
    if (dv <= 0 || px <= 0) return null
    const salePrice = vType === 'percent' ? px * (1 - dv / 100) : px - dv
    if (salePrice < 0) return { invalid: true }
    const pf = platform/100; const af = affiliate/100; const tf = tax/100
    const platFee = salePrice*pf; const affFee = salePrice*af; const taxFee = salePrice*tf
    const netRev = salePrice - platFee - affFee - taxFee
    const profit = netRev - rLocked.prodCost
    const margin = salePrice > 0 ? profit / salePrice : 0
    const monthly = profit * u
    const origPlatFee = px*pf; const origAffFee = px*af; const origTaxFee = px*tf
    const origNetRev = px - origPlatFee - origAffFee - origTaxFee
    const origProfit = origNetRev - rLocked.prodCost
    const origMonthly = origProfit * u
    const profitLost = origProfit - profit
    const monthlyLost = origMonthly - monthly
    return { salePrice, netRev, profit, margin, monthly, profitLost, monthlyLost, origProfit, bep: rLocked.bep }
  })()

  // ── Ads calc ──────────────────────────────────────────────────
  const adsCalc = (() => {
    const budget = parseFloat(adsBudget)||0; const cpc = parseFloat(adsCpc)||0; const cvr = (parseFloat(adsCvr)||0)/100
    if (!budget || !cpc || !cvr) return null
    const px = n(price); const u = n(units)
    const feeRate = (platform+affiliate+tax)/100
    const netPerUnit = px*(1-feeRate) - rLocked.prodCost
    const clicks = cpc > 0 ? Math.floor(budget/cpc) : 0
    const orders = Math.floor(clicks*cvr)
    const costSale = cvr > 0 ? cpc/cvr : 0
    const revenue = orders*px
    const roas = budget > 0 ? revenue/budget : 0
    const beRoas = netPerUnit > 0 ? px/netPerUnit : null
    const profitFromAds = orders*netPerUnit - budget
    const adSpendPct = revenue > 0 ? (budget/revenue)*100 : null
    return { budget, clicks, orders, costSale, revenue, roas, beRoas, profitFromAds, adSpendPct, netPerUnit, cvr, px, u }
  })()

  // ── Goal calc ─────────────────────────────────────────────────
  const goalCalc = (() => {
    const gm = n(goalProfit); if (!gm) return null
    const i = getInputs()
    const defectRate = i.defect/100
    const wastePerItem = i.cogs*defectRate/Math.max(1-defectRate,0.01)
    const returnFeeCost = defectRate*i.returnFee
    const fixedCostPerUnit = i.cogs+wastePerItem+returnFeeCost+i.packaging+i.labor+i.addlTotal
    const monthlyFixed = i.adSpend+i.monthlyLabor
    const feeRate = (i.platform+i.affiliate+i.tax)/100
    const netRate = Math.max(1-feeRate,0.01)
    const netRev = i.price*netRate
    const adPerUnit = i.units>0?i.adSpend/i.units:0
    const mlPerUnit = i.units>0?i.monthlyLabor/i.units:0
    const prodCost = fixedCostPerUnit+adPerUnit+mlPerUnit
    const profitPerItem = netRev - prodCost
    let unitsNeeded: number|null = null; let reqPrice: number|null = null
    if (i.price > 0 && netRev > fixedCostPerUnit) unitsNeeded = Math.ceil((gm+monthlyFixed)/(netRev-fixedCostPerUnit))
    if (i.units > 0) reqPrice = (fixedCostPerUnit+(monthlyFixed+gm)/i.units)/netRate
    const currentMonthly = profitPerItem*i.units
    return { unitsNeeded, reqPrice, currentMonthly, gap: gm-currentMonthly, profitPerItem }
  })()

  // ── CSS variables for dark mode ───────────────────────────────
  const cssVars = dark ? {
    '--bg':'#0d1220','--surface':'#131d2e','--surface2':'#1a2640','--surface3':'#1e2e4a',
    '--border':'rgba(91,127,255,0.18)','--border2':'rgba(91,127,255,0.28)',
    '--text':'#e2e8f5','--text2':'#8fa3c8','--text3':'#6b7fa0','--navy':'#1a2a50',
    '--accent':'#3b61c6','--accent2':'#5b7fff','--green':'#1ab87a','--red':'#e84040','--yellow':'#f5a623',
  } : {
    '--bg':'#eef2f8','--surface':'#ffffff','--surface2':'#f4f7fc','--surface3':'#e8edf7',
    '--border':'rgba(59,97,198,0.1)','--border2':'rgba(59,97,198,0.18)',
    '--text':'#1a2240','--text2':'#5a6589','--text3':'#7a86aa','--navy':'#253580',
    '--accent':'#3b61c6','--accent2':'#5b7fff','--green':'#1ab87a','--red':'#e84040','--yellow':'#f5a623',
  }

  const qsKeys = Object.keys(quickSaved)
  const spKeys = Object.keys(savedProducts)

  return (
    <>
      {/* XLSX CDN */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" async />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        .calc-root { font-family: 'Inter', sans-serif; }
        .calc-root * { box-sizing: border-box; }
        .calc-root input[type=number] { -moz-appearance: textfield; }
        .calc-root input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .flash-anim { animation: flashVal .3s ease; }
        @keyframes flashVal { 0%,100%{opacity:1} 50%{opacity:.4} }
        .bar-fill { transition: width .4s cubic-bezier(.4,0,.2,1); }
      `}</style>

      <div className="calc-root min-h-screen p-6 md:p-10" style={cssVars as any}>

        {/* ── HEADER ── */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3" style={{ background:'rgba(59,97,198,0.08)', borderColor:'rgba(59,97,198,0.2)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--accent)' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--accent)' }}>Live calculator</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color:'var(--navy)' }}>
                Online Seller <span style={{ color:'var(--accent)' }}>Pricing</span> Calculator
              </h1>
              <p className="mt-2 text-sm" style={{ color:'var(--text2)' }}>Enter your costs — profit and pricing update instantly.</p>

              {/* Mode toggle */}
              <div className="inline-flex mt-4 p-1 gap-1 rounded-full border" style={{ background:'var(--surface2)', borderColor:'var(--border2)' }}>
                {(['quick','advanced'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className="px-5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                    style={mode===m ? { background:'var(--accent)', color:'#fff', boxShadow:'0 2px 6px rgba(59,97,198,0.25)' } : { color:'var(--text3)' }}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Currency + dark mode */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs" style={{ color:'var(--text3)' }}>Currency</span>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border outline-none"
                  style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }}>
                  <option value="$">USD ($)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option>
                  <option value="₱">PHP (₱)</option><option value="RM">MYR (RM)</option><option value="S$">SGD (S$)</option>
                  <option value="₹">INR (₹)</option><option value="¥">CNY (¥)</option><option value="A$">AUD (A$)</option><option value="C$">CAD (C$)</option>
                </select>
                <button onClick={toggleDark} className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all" style={{ background:'var(--surface2)', borderColor:'var(--border2)', color: dark ? 'var(--yellow)' : 'var(--text2)' }}>
                  {dark ? '☀' : '🌙'}
                </button>
              </div>

              {/* Presets row — advanced only */}
              {mode==='advanced' && (
                <div className="flex flex-wrap gap-2 mt-4 items-center">
                  {[['current','Your current setup'],['shopee','Shopee'],['lazada','Lazada'],['tiktok','TikTok Shop'],['wholesale','Wholesale']].map(([k,label]) => (
                    <button key={k} onClick={() => k==='current' ? null : applyPreset(k)}
                      className="px-4 py-1.5 rounded-full border text-xs font-semibold transition-all"
                      style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text2)' }}>
                      {label}
                    </button>
                  ))}
                  {customPresets.map(p => (
                    <div key={p.id} className="inline-flex items-center rounded-full border overflow-hidden" style={{ background:'var(--surface2)', borderColor:'var(--border2)' }}>
                      <button onClick={() => applyCustomPreset(p.id)} className="px-3 py-1.5 text-xs font-semibold" style={{ color:'var(--text2)' }}>{p.name}</button>
                      <button onClick={() => openPresetModal(p.id)} className="px-2 py-1.5 border-l text-xs" style={{ borderColor:'var(--border)', color:'var(--text3)' }}>✎</button>
                      <button onClick={() => deletePreset(p.id)} className="px-2 py-1.5 border-l text-xs" style={{ borderColor:'var(--border)', color:'var(--text3)' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => openPresetModal(null)} className="px-3 py-1.5 border border-dashed rounded-full text-xs font-semibold" style={{ borderColor:'var(--border2)', color:'var(--text3)' }}>+ Add preset</button>
                </div>
              )}
            </div>

            {/* Action buttons — advanced only */}
            {mode==='advanced' && (
              <div className="flex flex-wrap gap-2">
                {[
                  { label:'Save', onClick: openSaveModal },
                  ...(activeProduct ? [{ label:'Update', onClick: updateProduct }] : []),
                  { label:'Reset', onClick: resetAdvanced },
                  { label:'Import', onClick: () => document.getElementById('import-file')?.click() },
                  { label:'Export', onClick: exportData, primary: true },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.onClick}
                    className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
                    style={(btn as any).primary ? { background:'var(--accent)', color:'#fff', border:'none' } : { background:'var(--surface)', borderColor:'var(--border2)', color:'var(--text2)' }}>
                    {btn.label}
                  </button>
                ))}
                <input type="file" id="import-file" accept=".xlsx,.xls" className="hidden" onChange={e => { if(e.target.files?.[0]) importData(e.target.files[0]); e.target.value='' }} />
              </div>
            )}
          </div>

          {/* ── QUICK MODE ── */}
          {mode==='quick' && (
            <div className="max-w-xl mx-auto">
              {/* Quick actions */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <Btn onClick={saveQuick}>💾 Save</Btn>
                {activeQuick && <Btn onClick={() => {
                  const s = quickSaved; const n2 = qName.trim()||activeQuick
                  const entry = { name:n2, cogs:qCogs, platform:qPlatform, affiliate:qAffiliate, tax:qTax, price:qPrice, target:qTarget, currency, savedAt:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }
                  const next = {...s}; if(n2!==activeQuick) delete next[activeQuick]; next[n2]=entry
                  setQuickSaved(next); localStorage.setItem('seller_quick_products',JSON.stringify(next)); setActiveQuick(n2); showToast(`"${n2}" updated!`)
                }}>✏️ Update</Btn>}
                <Btn onClick={resetQuick}>↺ Reset</Btn>
              </div>

              {/* Saved quick products */}
              {qsKeys.length > 0 && (
                <div className="mb-4 p-3 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border2)' }}>
                  <div className="flex justify-between mb-2"><span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text3)' }}>Saved products</span><span className="text-xs" style={{ color:'var(--text3)' }}>Click to load</span></div>
                  <div className="flex flex-wrap gap-2">
                    {qsKeys.map(k => (
                      <div key={k} className="inline-flex items-center rounded-full border overflow-hidden" style={{ background: activeQuick===k?'rgba(59,97,198,0.1)':'var(--surface)', borderColor: activeQuick===k?'var(--accent)':'var(--border2)' }}>
                        <button onClick={() => loadQuick(k)} className="px-3 py-1 text-xs font-semibold flex flex-col" style={{ color: activeQuick===k?'var(--accent)':'var(--text)' }}>
                          <span>{k}</span><span className="text-[10px]" style={{ color:'var(--text3)' }}>{quickSaved[k]?.savedAt||''}</span>
                        </button>
                        <button onClick={() => deleteQuick(k)} className="px-2 py-1 border-l text-sm" style={{ borderColor:'var(--border)', color:'var(--text3)' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Section icon="⚡" title="Quick pricing check" collapsible={false}>
                <p className="text-sm mb-4" style={{ color:'var(--text2)' }}>Enter your costs and fees — see profit, margin & break-even instantly.</p>
                <Field label="Product name" hint="optional label">
                  <Input value={qName} onChange={setQName} placeholder="e.g. Wireless Earbuds" dark={dark} />
                </Field>
                <Field label="Cost per unit" hint="what you pay/make per item">
                  <PrefixInput prefix={currency} value={qCogs} onChange={setQCogs} placeholder="0" dark={dark} />
                </Field>
                <Field label="Selling price" hint="what the customer pays">
                  <PrefixInput prefix={currency} value={qPrice} onChange={setQPrice} placeholder="0" dark={dark} />
                </Field>

                {/* Fees toggle */}
                <button onClick={() => { setQFeesOpen(o=>!o); if(!qFeesOpen) maybeOpenAffiliate() }}
                  className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold"
                  style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }}>
                  <span>Fees & Marketplace Settings <span className="font-normal text-xs" style={{ color:'var(--text3)' }}>platform, affiliate, tax, target</span></span>
                  <span style={{ transform: qFeesOpen?'rotate(0)':'rotate(-90deg)', display:'inline-block', transition:'transform .2s', color:'var(--text3)' }}>▼</span>
                </button>
                {qFeesOpen && (
                  <div className="mt-4 space-y-3">
                    <Field label="Platform fee" hint="Shopee, Lazada, TikTok Shop, etc.">
                      <SuffixInput suffix="%" value={qPlatform} onChange={v=>setQPlatform(Number(v))} dark={dark} />
                    </Field>
                    <Field label="Affiliate commission" hint="% paid to affiliates">
                      <SuffixInput suffix="%" value={qAffiliate} onChange={v=>setQAffiliate(Number(v))} dark={dark} />
                    </Field>
                    <Field label="Tax rate" hint="VAT or income tax">
                      <SuffixInput suffix="%" value={qTax} onChange={v=>setQTax(Number(v))} dark={dark} />
                    </Field>
                    <Field label="Target profit per item" hint="optional — get a suggested price">
                      <PrefixInput prefix={currency} value={qTarget} onChange={setQTarget} placeholder="0" dark={dark} />
                    </Field>
                    {qSuggestedPrice && (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border" style={{ background:'rgba(26,184,122,0.08)', borderColor:'rgba(26,184,122,0.25)' }}>
                        <span className="text-sm" style={{ color:'var(--text2)' }}>Sell at <b style={{ color:'var(--green)' }}>{f(qSuggestedPrice)}</b> to make <b>{f(n(qTarget))}</b> profit/item.</span>
                        <button onClick={() => setQPrice(qSuggestedPrice.toFixed(2))} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background:'var(--green)' }}>Use this price</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick results */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <KpiCard label="Profit per item" value={f(qr.profit)} sub="net after all fees" color={qr.profit>0?'var(--green)':qr.profit<0?'var(--red)':'var(--text3)'} accent={qr.profit>0?'green':qr.profit<0?'red':'yellow'} large />
                  <KpiCard label="Profit margin" value={(qr.margin*100).toFixed(1)+'%'} sub="of selling price" color={qr.margin>=0.2?'var(--green)':qr.margin<0?'var(--red)':'var(--yellow)'} accent={qr.margin>=0.2?'green':qr.margin<0?'red':'yellow'} />
                  <KpiCard label="You receive" value={f(qr.payout)} sub="payout after fees" color="var(--accent)" accent="blue" />
                </div>

                {/* Status */}
                {(n(qPrice)>0||n(qCogs)>0) && (
                  <div className={`mt-3 p-3 rounded-xl text-sm font-semibold text-center ${qr.profit<0?'bg-red-50 text-red-600':qr.margin<0.1?'bg-yellow-50 text-yellow-700':'bg-green-50 text-green-700'}`}>
                    {qr.profit<0 ? `🔴 Loss — you're selling below break-even (${f(qr.bep)}).` : qr.margin<0.1 ? `🟡 Thin margin — profitable, but barely. Break-even is ${f(qr.bep)}.` : `✅ Healthy — ${f(qr.profit)} profit per item at a ${(qr.margin*100).toFixed(0)}% margin.`}
                  </div>
                )}

                <button onClick={() => setMode('advanced')} className="w-full mt-4 py-3 border border-dashed rounded-xl text-xs font-semibold" style={{ borderColor:'var(--border2)', color:'var(--text3)' }}>
                  Need fees, ads, tax, monthly profit & more? Switch to Advanced →
                </button>
              </Section>
            </div>
          )}

          {/* ── ADVANCED MODE ── */}
          {mode==='advanced' && (
            <>
              {/* Saved products bar */}
              {spKeys.length > 0 && (
                <div className="mb-5 p-4 rounded-xl border" style={{ background:'var(--surface)', borderColor:'var(--border)' }}>
                  <div className="flex justify-between mb-2"><span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text3)' }}>Saved products</span><span className="text-xs" style={{ color:'var(--text3)' }}>Click to load</span></div>
                  <div className="flex flex-wrap gap-2">
                    {spKeys.map(k => (
                      <div key={k} className="inline-flex items-center rounded-full border overflow-hidden" style={{ background: activeProduct===k?'rgba(59,97,198,0.1)':'var(--surface2)', borderColor: activeProduct===k?'var(--accent)':'var(--border2)' }}>
                        <button onClick={() => loadProduct(k)} className="px-3 py-1 text-xs font-semibold flex flex-col" style={{ color: activeProduct===k?'var(--accent)':'var(--text)' }}>
                          <span>{k}</span><span className="text-[10px]" style={{ color:'var(--text3)' }}>{savedProducts[k]?.savedAt||''}</span>
                        </button>
                        <button onClick={() => deleteProduct(k)} className="px-2 py-1 border-l text-sm" style={{ borderColor:'var(--border)', color:'var(--text3)' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warn banner */}
              {n(price)>0 && n(price)<rLocked.bep && (
                <div className="flex items-center gap-3 p-3 rounded-xl border mb-5 text-sm font-medium" style={{ background:'rgba(232,64,64,0.07)', borderColor:'rgba(232,64,64,0.25)', color:'#c02020' }}>
                  ⚠ Selling at {f(n(price))} but break-even is {f(rLocked.bep)}. You're losing {f(rLocked.bep-n(price))} per unit.
                </div>
              )}

              {/* Help language */}
              <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-xs" style={{ color:'var(--text3)' }}>Explanations in:</span>
                {(['en','tl'] as const).map(l => (
                  <button key={l} onClick={() => setHelpLang(l)} className="px-3 py-1 rounded-full border text-xs font-semibold" style={helpLang===l ? { background:'var(--accent)', color:'#fff', borderColor:'var(--accent)' } : { background:'var(--surface2)', color:'var(--text3)', borderColor:'var(--border2)' }}>
                    {l==='en'?'🇬🇧 English':'🇵🇭 Tagalog'}
                  </button>
                ))}
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <KpiCard label="Profit per item" value={f(rLocked.profit)} sub="net after all fees" color={rLocked.profit>0?'var(--green)':rLocked.profit<0?'var(--red)':'var(--yellow)'} accent={rLocked.profit>0?'green':rLocked.profit<0?'red':'yellow'} helpId="profit" helpLang={helpLang} />
                <KpiCard label="Profit margin" value={(rLocked.margin*100).toFixed(1)+'%'} sub="of selling price" color={rLocked.margin>=0.2?'var(--green)':rLocked.margin<0?'var(--red)':'var(--yellow)'} accent={rLocked.margin>=0.2?'green':rLocked.margin<0?'red':'yellow'} helpId="margin" helpLang={helpLang} />
                <KpiCard label="You receive" value={f(rLocked.netRev)} sub="payout after fees, per item" color="var(--accent)" accent="blue" helpId="payout" helpLang={helpLang} />
                <KpiCard label={`Suggested price (3×)`} value={f(rLocked.suggested)} sub={n(price)>0?(n(price)>=rLocked.suggested?`You're ${f(n(price)-rLocked.suggested)} above suggested`:`${f(rLocked.suggested-n(price))} below suggested`):'3× your cost per unit'} color={n(price)>=rLocked.suggested&&n(price)>0?'var(--green)':'var(--yellow)'} accent={n(price)>=rLocked.suggested&&n(price)>0?'green':'yellow'} helpId="suggested" helpLang={helpLang} />
                <KpiCard label="Cost per unit" value={f(rLocked.prodCost)} sub="total cost to sell 1 item" color="var(--accent)" accent="blue" helpId="cost" helpLang={helpLang} />
                <KpiCard label="Total ads spend" value={f(n(adSpend))} sub={n(adSpend)>0&&rLocked.monthlyRev>0?`${(n(adSpend)/rLocked.monthlyRev*100).toFixed(1)}% of monthly revenue`:'monthly ad budget'} color={n(adSpend)<=0?'var(--accent)':rLocked.monthlyRev>0&&n(adSpend)/rLocked.monthlyRev<=0.1?'var(--green)':rLocked.monthlyRev>0&&n(adSpend)/rLocked.monthlyRev<=0.2?'var(--yellow)':'var(--red)'} accent={n(adSpend)<=0?'blue':rLocked.monthlyRev>0&&n(adSpend)/rLocked.monthlyRev<=0.1?'green':rLocked.monthlyRev>0&&n(adSpend)/rLocked.monthlyRev<=0.2?'yellow':'red'} helpId="ads" helpLang={helpLang} />
                <KpiCard label="ROI per month" value={(rLocked.roi).toFixed(1)+'%'} sub={rLocked.monthlyInvest>0?`${f(rLocked.monthlyProfit)} profit on ${f(rLocked.monthlyInvest)} invested`:'monthly profit ÷ total cost invested'} color={rLocked.roi<=0?'var(--red)':rLocked.roi<20?'var(--yellow)':rLocked.roi<50?'var(--accent)':'var(--green)'} accent={rLocked.roi<=0?'red':rLocked.roi<20?'yellow':rLocked.roi<50?'blue':'green'} helpId="roi" helpLang={helpLang} />
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
                <div>
                  {/* Product name */}
                  <div className="mb-4">
                    <Field label="Product name" hint="Optional label">
                      <Input value={name} onChange={setName} placeholder="e.g. Wireless Earbuds — Blue" dark={dark} />
                    </Field>
                  </div>

                  {/* Product Cost */}
                  <Section icon="📦" title="Product Cost (COGS)" id="sec-cost" collapsed={!isOpen('sec-cost')} onToggle={() => toggleSection('sec-cost')}>
                    <Field label="Cost per unit" hint="what you pay / manufacture per item">
                      <PrefixInput prefix={currency} value={cogs} onChange={setCogs} dark={dark} />
                      <HelpBox id="cogs" lang={helpLang} />
                    </Field>
                    <div className="mt-4 space-y-3">
                      <Field label="Defect / return rate" hint={defect===0?'No defects':defect<=5?'Excellent quality':defect<=15?`Normal — about 1 in ${Math.round(100/defect)} units`:'High — check your supplier'}>
                        <SuffixInput suffix="%" value={defect} onChange={v=>setDefect(Number(v))} dark={dark} />
                        <HelpBox id="defect" lang={helpLang} />
                      </Field>
                      <Field label="Return fee per item" hint="platform fee charged per returned order">
                        <PrefixInput prefix={currency} value={returnFee} onChange={setReturnFee} placeholder="0" dark={dark} />
                        <HelpBox id="return-fee" lang={helpLang} />
                      </Field>
                    </div>
                  </Section>

                  {/* Additional Costs */}
                  <Section icon="🔩" title="Additional Costs per Unit" id="sec-addl" collapsed={!isOpen('sec-addl')} onToggle={() => { toggleSection('sec-addl'); maybeOpenAffiliate() }}>
                    <div className="space-y-2 mb-3">
                      {additionals.map(a => (
                        <div key={a.id} className="flex items-center gap-2">
                          <input value={a.name} onChange={e=>updateAdditional(a.id,'name',e.target.value)}
                            placeholder="e.g. Shipping label, Insert card"
                            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                            style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
                          <div className="relative w-28 flex-shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs mono" style={{ color:'var(--text3)' }}>{currency}</span>
                            <input type="number" value={a.cost||''} onChange={e=>updateAdditional(a.id,'cost',parseFloat(e.target.value)||0)}
                              placeholder="0" className="w-full pl-7 pr-2 py-2 rounded-lg border text-sm outline-none mono"
                              style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
                          </div>
                          <button onClick={() => removeAdditional(a.id)} className="w-7 h-7 flex items-center justify-center rounded-lg border text-xs" style={{ background:'rgba(232,64,64,0.08)', borderColor:'rgba(232,64,64,0.2)', color:'var(--red)' }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addAdditional} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-dashed text-xs font-semibold" style={{ background:'rgba(59,97,198,0.08)', borderColor:'rgba(59,97,198,0.3)', color:'var(--accent)' }}>+ Add cost</button>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor:'var(--border)' }}>
                      <span className="text-xs font-semibold" style={{ color:'var(--text2)' }}>Total additional costs</span>
                      <span className="mono text-sm font-semibold" style={{ color:'var(--accent)' }}>{f(addlTotal)}</span>
                    </div>
                  </Section>

                  {/* Fees */}
                  <Section icon="💸" title="Platform & Fees" id="sec-fees" collapsed={!isOpen('sec-fees')} onToggle={() => { toggleSection('sec-fees'); maybeOpenAffiliate() }}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Platform fee" hint="TikTok ~8%, Shopee ~25%">
                        <SuffixInput suffix="%" value={platform} onChange={v=>setPlatform(Number(v))} dark={dark} />
                        <HelpBox id="platform" lang={helpLang} />
                      </Field>
                      <Field label="Affiliate commission" hint="% paid to affiliates">
                        <SuffixInput suffix="%" value={affiliate} onChange={v=>setAffiliate(Number(v))} dark={dark} />
                        <HelpBox id="affiliate" lang={helpLang} />
                      </Field>
                      <Field label="Tax rate" hint="VAT or income tax">
                        <SuffixInput suffix="%" value={tax} onChange={v=>setTax(Number(v))} dark={dark} />
                        <HelpBox id="tax" lang={helpLang} />
                      </Field>
                    </div>
                  </Section>

                  {/* Overhead & Pricing */}
                  <Section icon="🎯" title="Overhead & Pricing" id="sec-overhead" collapsed={!isOpen('sec-overhead')} onToggle={() => { toggleSection('sec-overhead'); maybeOpenAffiliate() }}>
                    <div className="space-y-4">
                      {/* Monthly ad spend — full width */}
                      <Field label="Monthly ad spend" hint={n(adSpend)>0&&n(units)>0?`= ${f(n(adSpend)/n(units))} per unit (${f(n(adSpend))} ÷ ${n(units)} units)`:'Facebook, TikTok, Shopee Ads, etc.'}>
                        <PrefixInput prefix={currency} value={adSpend} onChange={setAdSpend} placeholder="0" dark={dark} />
                        <HelpBox id="adspend" lang={helpLang} />
                      </Field>

                      {/* Packaging + Labor — 2 columns */}
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Packaging per item" hint="boxes, bags, labels">
                          <PrefixInput prefix={currency} value={packaging} onChange={setPackaging} dark={dark} />
                          <HelpBox id="packaging" lang={helpLang} />
                        </Field>
                        <Field label="Labor per item" hint="your time!">
                          <PrefixInput prefix={currency} value={labor} onChange={setLabor} dark={dark} />
                          <HelpBox id="labor" lang={helpLang} />
                        </Field>
                      </div>

                      {/* Monthly labor cost — full width */}
                      <Field label="Monthly labor cost" hint={n(monthlyLabor)>0&&n(units)>0?`= ${f(n(monthlyLabor)/n(units))} per unit`:'salary, helpers, packers, etc.'}>
                        <PrefixInput prefix={currency} value={monthlyLabor} onChange={setMonthlyLabor} placeholder="0" dark={dark} />
                        <HelpBox id="monthly-labor" lang={helpLang} />
                      </Field>

                      {/* Selling price + Target monthly units — 2 columns */}
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Selling price" hint="what you charge">
                          <PrefixInput prefix={currency} value={targetLocked&&targetPrice?targetPrice.toFixed(2):price} onChange={v=>{ setPrice(v); setTargetProfit(''); setTargetLocked(false) }} dark={dark} />
                          <HelpBox id="price" lang={helpLang} />
                        </Field>
                        <Field label="Target monthly units" hint="your sales goal">
                          <Input value={units} onChange={setUnits} dark={dark} comma />
                          <HelpBox id="units" lang={helpLang} />
                        </Field>
                      </div>

                      {/* Payout delay — full width with clear hint */}
                      <Field label="Payout delay" hint="how many weeks before the platform pays you">
                        <SuffixInput suffix="wks" value={payoutWeeks} onChange={v=>setPayoutWeeks(Number(v))} dark={dark} min={1} max={12} />
                        <HelpBox id="payout-weeks" lang={helpLang} />
                      </Field>
                    </div>

                    {/* Target profit */}
                    <div className="mt-5 pt-5 border-t" style={{ borderColor:'var(--border)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:'var(--text3)' }}>Target profit calculator</div>
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <Field label="I want to earn" hint="profit per item">
                          <PrefixInput prefix={currency} value={targetProfit} onChange={setTargetProfit} placeholder="e.g. 10" dark={dark} />
                        </Field>
                        <Field label="Required selling price">
                          <div className="px-3 py-2 rounded-lg border" style={{ background:'var(--surface2)', borderColor:'var(--border2)' }}>
                            <span className="mono text-sm font-semibold" style={{ color:'var(--green)' }}>
                              {targetPrice ? f(targetPrice) : '—'}
                            </span>
                          </div>
                        </Field>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {targetPrice && (
                          <button onClick={() => { setPrice(targetPrice!.toFixed(2)); setTargetProfit(''); showToast('Selling price updated!') }}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'var(--accent)' }}>
                            Use this price
                          </button>
                        )}
                        <button onClick={() => setTargetLocked(l=>!l)}
                          className="px-4 py-2 rounded-lg border text-xs font-semibold transition-all"
                          style={targetLocked ? { background:'rgba(26,184,122,0.12)', borderColor:'var(--green)', color:'var(--green)' } : { background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text3)' }}>
                          {targetLocked?'🔒':'🔓'} Live lock
                        </button>
                      </div>
                    </div>
                  </Section>

                  {/* Profit Goal */}
                  <Section icon="💰" title="Profit Goal Calculator" id="sec-goal" collapsed={!isOpen('sec-goal')} onToggle={() => toggleSection('sec-goal')}>
                    <p className="text-sm mb-5" style={{ color:'var(--text2)' }}>Set a monthly profit target — see exactly how many units to sell or what price to charge.</p>
                    <Field label="I want to earn per month" hint="your profit goal">
                      <PrefixInput prefix={currency} value={goalProfit} onChange={v => setGoalProfit(v)} placeholder="e.g. 50,000" dark={dark} />
                    </Field>
                    {goalCalc && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <div className="p-5 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color:'var(--text3)' }}>Option A</div>
                          <div className="text-xs font-semibold mb-3" style={{ color:'var(--text)' }}>Keep price, sell more</div>
                          <div className="mono text-2xl font-semibold mb-1" style={{ color: goalCalc.unitsNeeded?'var(--accent)':'var(--red)' }}>
                            {goalCalc.unitsNeeded ? goalCalc.unitsNeeded.toLocaleString()+' units' : n(price)<=0?'Enter a price':'∞'}
                          </div>
                          {goalCalc.unitsNeeded && <button onClick={() => { setUnits(String(goalCalc.unitsNeeded)); showToast('Target units updated!') }} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background:'var(--accent)' }}>Set as target units</button>}
                        </div>
                        <div className="p-5 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color:'var(--text3)' }}>Option B</div>
                          <div className="text-xs font-semibold mb-3" style={{ color:'var(--text)' }}>Keep volume, raise price</div>
                          <div className="mono text-2xl font-semibold mb-1" style={{ color:'var(--green)' }}>
                            {goalCalc.reqPrice ? f(goalCalc.reqPrice) : n(units)<=0?'Enter monthly units':'—'}
                          </div>
                          {goalCalc.reqPrice && <button onClick={() => { setPrice(goalCalc.reqPrice!.toFixed(2)); showToast('Selling price updated!') }} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background:'var(--green)' }}>Apply this price</button>}
                        </div>
                      </div>
                    )}
                    {goalCalc && goalCalc.profitPerItem>0 && n(units)>0 && (
                      <div className="mt-4 p-4 rounded-xl border text-sm" style={{ background: goalCalc.gap>0?'rgba(59,97,198,0.07)':'rgba(26,184,122,0.07)', borderColor: goalCalc.gap>0?'rgba(59,97,198,0.15)':'rgba(26,184,122,0.25)', color:'var(--text2)' }}>
                        {goalCalc.gap>0 ? <>📊 You're currently making <b>{f(goalCalc.currentMonthly)}/month</b>. You need <b>{f(goalCalc.gap)}</b> more to hit your goal.</> : <>✅ You're already hitting your goal! Current monthly profit: <b>{f(goalCalc.currentMonthly)}</b>.</>}
                      </div>
                    )}
                  </Section>

                  {/* Voucher simulator */}
                  <Section icon="🏷️" title="Sale / Voucher Simulator" id="sec-voucher" collapsed={!isOpen('sec-voucher')} onToggle={() => toggleSection('sec-voucher')}>
                    <p className="text-sm mb-5" style={{ color:'var(--text2)' }}>Simulate a sale or voucher discount — see the impact on your profit before you run it.</p>
                    <div className="flex flex-wrap gap-3 mb-5 items-end">
                      <Field label="Discount value">
                        <input type="number" value={vValue} onChange={e=>setVValue(e.target.value)} placeholder="e.g. 10"
                          className="w-36 px-3 py-2 rounded-lg border text-sm mono outline-none"
                          style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
                      </Field>
                      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor:'var(--border2)' }}>
                        <button onClick={() => setVType('percent')} className="px-4 py-2 text-xs font-semibold" style={vType==='percent'?{background:'var(--accent)',color:'#fff'}:{background:'var(--surface2)',color:'var(--text2)'}}>% Off</button>
                        <button onClick={() => setVType('fixed')} className="px-4 py-2 text-xs font-semibold border-l" style={{borderColor:'var(--border2)',...(vType==='fixed'?{background:'var(--accent)',color:'#fff'}:{background:'var(--surface2)',color:'var(--text2)'})}}>
                          {currency} Off
                        </button>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'var(--text3)' }}>Quick picks</div>
                        <div className="flex gap-1">
                          {[5,10,15,20,25].map(p => <button key={p} onClick={() => { setVType('percent'); setVValue(String(p)) }} className="px-3 py-1 rounded-full border text-xs font-semibold" style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text2)' }}>{p}%</button>)}
                        </div>
                      </div>
                    </div>
                    {vCalc && !(vCalc as any).invalid && (() => {
                      const vc = vCalc as any
                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            {[
                              { label:'Sale price', val:f(vc.salePrice), sub:`was ${f(n(price))} · ${vType==='percent'?vValue+'% off':currency+vValue+' off'}`, color:'var(--text)' },
                              { label:'You receive', val:f(vc.netRev), sub:'after all fees', color:'var(--accent)' },
                              { label:'Profit / item', val:f(vc.profit), sub:vc.origProfit?`was ${f(vc.origProfit)}`:'', color:vc.profit>0?'var(--green)':vc.profit<0?'var(--red)':'var(--yellow)' },
                              { label:'Margin', val:(vc.margin*100).toFixed(1)+'%', sub:`was ${(n(price)>0?vc.origProfit/n(price)*100:0).toFixed(1)}%`, color:vc.margin>=0.2?'var(--green)':vc.margin<0?'var(--red)':'var(--yellow)' },
                              { label:'Monthly profit', val:f(vc.monthly), sub:n(units)>0?`was ${f(vc.origProfit*n(units))}`:'set monthly units', color:vc.profit>0?'var(--green)':'var(--red)' },
                              { label:'Profit lost', val:f(Math.abs(vc.profitLost))+'/item', sub:n(units)>0?`${f(Math.abs(vc.monthlyLost))}/month total`:'', color:vc.profitLost>0?'var(--red)':'var(--green)' },
                            ].map(item => (
                              <div key={item.label} className="p-4 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'var(--text3)' }}>{item.label}</div>
                                <div className="mono text-sm font-semibold break-all leading-snug" style={{ color:item.color }}>{item.val}</div>
                                <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>{item.sub}</div>
                              </div>
                            ))}
                          </div>
                          <div className="p-4 rounded-xl border text-sm font-medium" style={
                            vc.salePrice<vc.bep ? { background:'rgba(232,64,64,0.08)', borderColor:'rgba(232,64,64,0.25)', color:'var(--red)' }
                            : vc.margin<0.1 ? { background:'rgba(245,166,35,0.08)', borderColor:'rgba(245,166,35,0.3)', color:'var(--yellow)' }
                            : { background:'rgba(26,184,122,0.08)', borderColor:'rgba(26,184,122,0.25)', color:'var(--green)' }
                          }>
                            {vc.salePrice<vc.bep ? `🔴 Selling at a loss. Break-even is ${f(vc.bep)} — your sale price of ${f(vc.salePrice)} is ${f(vc.bep-vc.salePrice)} below break-even.`
                            : vc.margin<0.1 ? `🟡 Very thin margin. You're still profitable but only ${(vc.margin*100).toFixed(1)}% margin. You give up ${f(vc.profitLost)} profit per unit.`
                            : `✅ Still profitable. You give up ${f(vc.profitLost)} profit per unit${n(units)>0?` · ${f(vc.monthlyLost)}/month`:''} but maintain a healthy ${(vc.margin*100).toFixed(1)}% margin.`}
                          </div>
                        </>
                      )
                    })()}
                  </Section>

                  {/* Ads simulator */}
                  <Section icon="📣" title="Ads Simulator" id="sec-ads" collapsed={!isOpen('sec-ads')} onToggle={() => toggleSection('sec-ads')}>
                    <p className="text-sm mb-5" style={{ color:'var(--text2)' }}>Simulate an ad campaign — enter your budget, CPC, and conversion rate to see clicks, orders, ROAS, and profit impact.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <Field label="Ad budget" hint="this campaign"><PrefixInput prefix={currency} value={adsBudget} onChange={setAdsBudget} placeholder="e.g. 5000" dark={dark} /></Field>
                      <Field label="Cost per click (CPC)"><PrefixInput prefix={currency} value={adsCpc} onChange={setAdsCpc} placeholder="e.g. 3.50" dark={dark} /></Field>
                      <Field label="Conversion rate"><SuffixInput suffix="%" value={adsCvr} onChange={setAdsCvr} dark={dark} /></Field>
                    </div>
                    {adsCalc && (() => {
                      const ac = adsCalc
                      const roasColor = ac.beRoas!==null&&ac.roas>=ac.beRoas?'var(--green)':'var(--red)'
                      const profColor = ac.profitFromAds>0?'var(--green)':ac.profitFromAds<0?'var(--red)':'var(--yellow)'
                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {[
                              { label:'Clicks', val:ac.clicks.toLocaleString(), color:'var(--text)' },
                              { label:'Orders from ads', val:ac.orders.toLocaleString(), color:'var(--text)' },
                              { label:'Cost per sale', val:f(ac.costSale), color:'var(--text)' },
                              { label:'Revenue from ads', val:f(ac.revenue), color:'var(--accent)' },
                              { label:'ROAS', val:ac.roas.toFixed(2)+'x', color:roasColor },
                              { label:'Break-even ROAS', val:ac.beRoas!==null?ac.beRoas.toFixed(2)+'x':'N/A', color:'var(--text)' },
                              { label:'Profit after ads', val:f(ac.profitFromAds), color:profColor },
                              { label:'Ad spend % of revenue', val:ac.adSpendPct!==null?ac.adSpendPct.toFixed(1)+'%':'—', color:ac.adSpendPct!==null?(ac.adSpendPct<=20?'var(--green)':ac.adSpendPct<=35?'var(--yellow)':'var(--red)'):'var(--text3)' },
                            ].map(item => (
                              <div key={item.label} className="p-4 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                                <div className="text-xs font-bold uppercase tracking-widest mb-2 leading-tight" style={{ color:'var(--text3)' }}>{item.label}</div>
                                <div className="mono text-sm font-semibold break-all leading-snug" style={{ color:item.color }}>{item.val}</div>
                              </div>
                            ))}
                          </div>
                          <div className="p-4 rounded-xl border text-sm font-medium" style={
                            ac.px<=0 ? { background:'rgba(245,166,35,0.08)', borderColor:'rgba(245,166,35,0.3)', color:'var(--yellow)' }
                            : ac.beRoas===null||ac.profitFromAds<0 ? { background:'rgba(232,64,64,0.08)', borderColor:'rgba(232,64,64,0.25)', color:'var(--red)' }
                            : ac.roas<(ac.beRoas||0)*1.25 ? { background:'rgba(245,166,35,0.08)', borderColor:'rgba(245,166,35,0.3)', color:'var(--yellow)' }
                            : { background:'rgba(26,184,122,0.08)', borderColor:'rgba(26,184,122,0.25)', color:'var(--green)' }
                          }>
                            {ac.px<=0?'⚠️ Set a selling price in the main calculator to see profitability.'
                            :ac.beRoas===null?'🔴 Your current selling price is already below break-even after fees and costs.'
                            :ac.profitFromAds<0?`🔴 Losing money on this campaign. Your ROAS of ${ac.roas.toFixed(2)}x is below the break-even ROAS of ${ac.beRoas.toFixed(2)}x.`
                            :ac.roas<ac.beRoas*1.25?`🟡 Thin margin on ads. ROAS of ${ac.roas.toFixed(2)}x is above break-even (${ac.beRoas.toFixed(2)}x) but not by much. Profit after ads: ${f(ac.profitFromAds)}.`
                            :`✅ Profitable campaign. ROAS of ${ac.roas.toFixed(2)}x beats your break-even of ${ac.beRoas.toFixed(2)}x. ${ac.orders.toLocaleString()} orders · ${f(ac.profitFromAds)} profit after ads.`}
                          </div>
                        </>
                      )
                    })()}
                  </Section>

                  {/* Price comparison */}
                  <Section icon="📊" title="Price Comparison Table" id="sec-pricetable" collapsed={!isOpen('sec-pricetable')} onToggle={() => toggleSection('sec-pricetable')}>
                    <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor:'var(--border)' }}>
                      <span className="text-xs font-medium" style={{ color:'var(--text2)' }}>Compare prices:</span>
                      <div className="flex flex-wrap gap-2">
                        {pricePoints.map(v => (
                          <span key={v} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border mono text-xs font-medium" style={{ background:'rgba(59,97,198,0.1)', borderColor:'rgba(59,97,198,0.2)', color:'var(--accent)' }}>
                            {currency}{v}<button onClick={() => setPricePoints(pts=>pts.filter(x=>x!==v))} className="ml-1" style={{ color:'var(--text3)' }}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 mono text-xs" style={{ color:'var(--text3)' }}>{currency}</span>
                          <input type="number" value={ptInput} onChange={e=>setPtInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addPricePoint()}
                            placeholder="e.g. 299" className="w-28 pl-6 pr-2 py-1.5 rounded-lg border mono text-sm outline-none"
                            style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
                        </div>
                        <button onClick={addPricePoint} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background:'var(--accent)' }}>+ Add</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background:'var(--surface2)' }}>
                            {['Selling Price','You Receive','Profit/Item','Margin','Monthly Profit','Status',''].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest border-b" style={{ color:'var(--text3)', borderColor:'var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pricePoints.length===0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color:'var(--text3)' }}>Add a price point above to compare</td></tr>
                          ) : pricePoints.map((v, i) => {
                            const d = calcRowData(v)
                            const isCurrent = Math.abs(v-n(price))<0.01
                            const profColor = d.profit>0?'var(--green)':d.profit<0?'var(--red)':'var(--text3)'
                            const margColor = d.margin>=0.2?'var(--green)':d.margin<0?'var(--red)':'var(--yellow)'
                            const [status,statusBg,statusColor] = v<d.bep?['🔴 Loss','rgba(232,64,64,0.08)','var(--red)']:v<d.prodCost*2?['🟡 Low','rgba(245,166,35,0.1)','var(--yellow)']:v>=d.prodCost*3?['🟢 Great','rgba(26,184,122,0.1)','var(--green)']:['🔵 OK','rgba(59,97,198,0.08)','var(--accent)']
                            return (
                              <tr key={v} style={{ background: isCurrent?'rgba(59,97,198,0.05)':i%2===0?'transparent':'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                                <td className="px-4 py-3">
                                  <span className="mono font-semibold" style={{ color:'var(--text)' }}>{currency}{v.toFixed(2)}</span>
                                  {isCurrent && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:'rgba(59,97,198,0.1)', color:'var(--accent)' }}>current</span>}
                                </td>
                                <td className="px-4 py-3 text-right mono text-xs" style={{ color:'var(--accent)' }}>{f(d.netRev)}</td>
                                <td className="px-4 py-3 text-right mono text-xs font-semibold" style={{ color:profColor }}>{d.profit>=0?'':'-'}{f(d.profit)}</td>
                                <td className="px-4 py-3 text-right mono text-xs" style={{ color:margColor }}>{(d.margin*100).toFixed(1)}%</td>
                                <td className="px-4 py-3 text-right mono text-xs" style={{ color:profColor }}>{f(d.monthly)}</td>
                                <td className="px-4 py-3 text-center"><span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background:statusBg, color:statusColor }}>{status}</span></td>
                                <td className="px-4 py-3 text-center"><button onClick={() => setPricePoints(pts=>pts.filter(x=>x!==v))} className="text-lg" style={{ color:'var(--text3)' }}>×</button></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="sticky top-6 rounded-2xl overflow-hidden border shadow-lg" style={{ background:'var(--surface)', borderColor:'var(--border)' }}>
                  <div className="px-6 py-5 border-b" style={{ background:'var(--navy)', borderColor:'rgba(255,255,255,0.1)' }}>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color:'rgba(255,255,255,0.6)' }}>Selling at</div>
                    <div className="mono text-3xl font-semibold text-white">{f(targetLocked&&targetPrice?targetPrice:n(price))}</div>
                    <div className="text-xs mt-1" style={{ color:'rgba(255,255,255,0.55)' }}>{name||'—'}</div>
                  </div>

                  {/* Bars */}
                  <div className="px-6 py-5 border-b" style={{ background:'var(--navy)', borderColor:'rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.65)' }}>
                        {breakdownMode==='item'?'Cost breakdown per item':'Cost breakdown monthly total'}
                      </div>
                      <div className="flex rounded-2xl overflow-hidden p-1" style={{ background:'rgba(0,0,0,0.2)' }}>
                        {(['item','monthly'] as const).map(m => (
                          <button key={m} onClick={() => setBreakdownMode(m)} className="px-3 py-1 rounded-xl text-xs font-semibold capitalize" style={breakdownMode===m?{background:'#fff',color:'var(--accent)'}:{background:'transparent',color:'rgba(255,255,255,0.5)'}}>
                            {m==='item'?'Per item':'Monthly'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const mul = breakdownMode==='monthly'?n(units):1
                      const ri = rLocked
                      const bars = [
                        { label:'COGS', val:n(cogs)*mul, color:'#378ADD' },
                        { label:'Defect / returns', val:(ri.wastePerItem+(defect/100)*n(returnFee))*mul, color:'#ff5252' },
                        { label:'Additional costs', val:addlTotal*mul, color:'#20b2aa' },
                        { label:'Packaging', val:n(packaging)*mul, color:'#ffb84d' },
                        { label:'Labor', val:(n(labor)+ri.monthlyLaborPerUnit)*mul, color:'#ff8c5a' },
                        { label:'Ads', val:ri.adPerUnit*mul, color:'#e040fb' },
                        { label:'Platform fee', val:ri.platFee*mul, color:'#888780' },
                        { label:'Affiliate', val:ri.affFee*mul, color:'#d4537e' },
                      ]
                      const maxV = Math.max(...bars.map(b=>b.val), 1)
                      return bars.map(b => (
                        <div key={b.label} className="flex items-center gap-2 mb-3 last:mb-0">
                          <span className="text-xs w-32 flex-shrink-0 truncate" style={{ color:'rgba(255,255,255,0.85)' }}>{b.label}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.12)' }}>
                            <div className="h-full rounded-full bar-fill" style={{ width:`${Math.max(0,(b.val/maxV)*100).toFixed(1)}%`, background:b.color }} />
                          </div>
                          <span className="mono text-xs w-16 text-right" style={{ color:'rgba(255,255,255,0.95)' }}>{f(b.val)}</span>
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Breakdown */}
                  <div className="px-6 py-4 border-b" style={{ borderColor:'var(--border)' }}>
                    {[
                      { label:'Selling price', val:f(targetLocked&&targetPrice?targetPrice:n(price)), color:'var(--text)' },
                      { label:'− Platform fee', val:'−'+f(rLocked.platFee), color:'var(--red)' },
                      { label:'− Affiliate commission', val:'−'+f(rLocked.affFee), color:'var(--red)' },
                      { label:'− Tax', val:'−'+f(rLocked.taxFee), color:'var(--red)' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between py-2 border-b" style={{ borderColor:'var(--border)' }}>
                        <span className="text-sm" style={{ color:'var(--text2)' }}>{row.label}</span>
                        <span className="mono text-sm" style={{ color:row.color }}>{row.val}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 px-2 my-1 rounded-lg border-b" style={{ background:'rgba(59,97,198,0.06)', borderColor:'transparent' }}>
                      <span className="text-sm font-semibold" style={{ color:'var(--text)' }}>💳 You receive</span>
                      <span className="mono text-sm font-semibold" style={{ color:'var(--accent)' }}>{f(rLocked.netRev)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b" style={{ borderColor:'var(--border)' }}>
                      <span className="text-sm" style={{ color:'var(--text2)' }}>− Total cost per unit</span>
                      <span className="mono text-sm" style={{ color:'var(--red)' }}>−{f(rLocked.prodCost)}</span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-sm font-semibold" style={{ color:'var(--text)' }}>=  Net profit</span>
                      <span className="mono text-base font-semibold" style={{ color:rLocked.profit>=0?'var(--green)':'var(--red)' }}>
                        {rLocked.profit<0?'−':''}{f(rLocked.profit)}
                      </span>
                    </div>
                  </div>

                  {/* Monthly stats */}
                  <div className="grid grid-cols-2 gap-3 p-4">
                    {[
                      { label:'Monthly profit', val:f(rLocked.monthlyProfit), color:rLocked.monthlyProfit>=0?'var(--green)':'var(--red)' },
                      { label:'Monthly revenue', val:f(rLocked.monthlyRev), color:'var(--text)' },
                      { label:'Break-even price', val:f(rLocked.bep), color:'var(--text)' },
                      { label:'Monthly inventory cost', val:f(rLocked.monthlyCogs), color:'var(--text)' },
                      { label:'Units per day', val:n(units)>0?(n(units)/30).toFixed(1)+' units':'—', color:'var(--text)' },
                      { label:'Units per week', val:n(units)>0?(n(units)*7/30).toFixed(1)+' units':'—', color:'var(--text)' },
                      { label:'Daily ad spend', val:n(adSpend)>0?f(n(adSpend)/30):'—', color:n(adSpend)>0?'var(--accent)':'var(--text3)' },
                      { label:'Weekly ad spend', val:n(adSpend)>0?f(n(adSpend)*7/30):'—', color:n(adSpend)>0?'var(--accent)':'var(--text3)' },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                        <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:'var(--text2)' }}>{item.label}</div>
                        <div className="mono text-base font-semibold" style={{ color:item.color }}>{item.val}</div>
                      </div>
                    ))}
                    <div className="col-span-2 p-3 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:'var(--text2)' }}>Monthly fees & overhead</div>
                      <div className="mono text-base font-semibold" style={{ color:'var(--text)' }}>{f(rLocked.monthlyOverhd)}</div>
                      {n(units)>0 && <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>packaging + labor + ads + fees × {n(units)} units</div>}
                    </div>
                    <div className="col-span-2 p-3 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:'var(--text2)' }}>Total monthly invested</div>
                      <div className="mono text-base font-semibold" style={{ color:'var(--accent)' }}>{rLocked.monthlyInvest>0?f(rLocked.monthlyInvest):'—'}</div>
                      <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>stock + packaging + labor + ads + extras</div>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl border" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color:'var(--text2)' }}>Capital needed (payout delay)</div>
                      <div className="mono text-base font-semibold" style={{ color:'var(--yellow)' }}>{n(units)>0?f(rLocked.capitalNeeded):'—'}</div>
                      <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>
                        {n(units)>0?`${payoutWeeks}-week payout delay × ${n(units)} units/mo (cost/unit: ${f(rLocked.prodCost)})`:'enter monthly units & payout delay to calculate'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── MODALS ── */}
        {saveModalOpen && (
          <Modal onClose={() => setSaveModalOpen(false)}>
            <div className="text-base font-bold mb-1" style={{ color:'var(--text)' }}>Save product</div>
            <div className="text-sm mb-4" style={{ color:'var(--text2)' }}>Give this pricing setup a name to save it.</div>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmSave()}
              placeholder="e.g. Blue Wireless Earbuds" autoFocus
              className="w-full px-4 py-3 rounded-xl border mb-4 text-sm outline-none"
              style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveModalOpen(false)} className="px-5 py-2 rounded-lg border text-sm font-semibold" style={{ borderColor:'var(--border2)', color:'var(--text2)' }}>Cancel</button>
              <button onClick={confirmSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background:'var(--accent)' }}>Save product</button>
            </div>
          </Modal>
        )}

        {presetModalOpen && (
          <Modal onClose={() => setPresetModalOpen(false)}>
            <div className="text-base font-bold mb-1" style={{ color:'var(--text)' }}>{editPresetId!==null?'Update preset':'Add preset'}</div>
            <div className="text-sm mb-4" style={{ color:'var(--text2)' }}>Save your platform fee settings as a reusable preset.</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color:'var(--text2)' }}>Preset name</label>
                <input value={cpm.name} onChange={e=>setCpm(c=>({...c,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&confirmPreset()}
                  placeholder="e.g. Amazon US, Lazada…" autoFocus
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
              </div>
              {[['platform','Platform fee (%)'],['affiliate','Affiliate commission (%)'],['tax','Tax rate (%)'],['price','Default selling price']].map(([k,lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium mb-1" style={{ color:'var(--text2)' }}>{lbl}</label>
                  <input type="number" value={(cpm as any)[k]} onChange={e=>setCpm(c=>({...c,[k]:e.target.value}))} placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none mono"
                    style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPresetModalOpen(false)} className="px-5 py-2 rounded-lg border text-sm font-semibold" style={{ borderColor:'var(--border2)', color:'var(--text2)' }}>Cancel</button>
              <button onClick={confirmPreset} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background:'var(--accent)' }}>{editPresetId!==null?'Update':'Save preset'}</button>
            </div>
          </Modal>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-7 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-sm font-medium text-white shadow-xl z-50 whitespace-nowrap" style={{ background:'var(--navy)' }}>
            {toast}
          </div>
        )}
      </div>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ icon, title, id, children, collapsed, onToggle, collapsible=true }: {
  icon: string; title: string; id?: string; children: React.ReactNode
  collapsed?: boolean; onToggle?: () => void; collapsible?: boolean
}) {
  return (
    <div className="rounded-2xl border overflow-hidden mb-4" style={{ background:'var(--surface)', borderColor:'var(--border)', boxShadow:'0 2px 8px rgba(59,97,198,0.06)' }}>
      {collapsible && onToggle ? (
        <button onClick={onToggle} className="w-full flex items-center gap-3 px-6 py-3.5 border-b text-left" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background:'rgba(59,97,198,0.08)' }}>{icon}</div>
          <span className="text-xs font-bold uppercase tracking-widest flex-1" style={{ color:'var(--text)' }}>{title}</span>
          <span style={{ color:'var(--text3)', transform: collapsed?'rotate(-90deg)':'rotate(0)', display:'inline-block', transition:'transform .25s' }}>▼</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 px-6 py-3.5 border-b" style={{ background:'var(--surface2)', borderColor:'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background:'rgba(59,97,198,0.08)' }}>{icon}</div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text)' }}>{title}</span>
        </div>
      )}
      {(!collapsible || !collapsed) && <div className="p-6">{children}</div>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <label className="text-xs font-medium flex-shrink-0" style={{ color:'var(--text2)' }}>{label}</label>
        {hint && <span className="text-xs" style={{ color:'var(--text3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function formatComma(raw: string): string {
  if (!raw) return ''
  const stripped = raw.replace(/,/g, '')
  if (stripped === '' || stripped === '-' || stripped.endsWith('.') || stripped.endsWith('.0') || stripped.endsWith('.00')) return raw.replace(/,/g, '')
  const parts = stripped.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

function handleCommaChange(raw: string, onChange: (v: string) => void) {
  const stripped = raw.replace(/,/g, '')
  onChange(stripped)
}

function Input({ value, onChange, placeholder, dark, comma }: { value: string; onChange: (v:string)=>void; placeholder?: string; dark: boolean; comma?: boolean }) {
  return (
    <input
      value={comma ? formatComma(value) : value}
      onChange={e => comma ? handleCommaChange(e.target.value, onChange) : onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
      style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
  )
}

function PrefixInput({ prefix, value, onChange, placeholder, dark }: { prefix: string; value: string|number; onChange: (v:string)=>void; placeholder?: string; dark: boolean }) {
  const strVal = String(value)
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs mono pointer-events-none" style={{ color:'var(--text3)' }}>{prefix}</span>
      <input
        value={formatComma(strVal)}
        onChange={e => handleCommaChange(e.target.value, onChange)}
        placeholder={placeholder||'0'}
        className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm mono outline-none"
        style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
    </div>
  )
}

function SuffixInput({ suffix, value, onChange, dark, min, max }: { suffix: string; value: string|number; onChange: (v:string)=>void; dark: boolean; min?: number; max?: number }) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={e=>onChange(e.target.value)} min={min} max={max}
        className="w-full pl-3 pr-10 py-2 rounded-lg border text-sm mono outline-none"
        style={{ background:'var(--surface2)', borderColor:'var(--border2)', color:'var(--text)' }} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs mono pointer-events-none" style={{ color:'var(--text3)' }}>{suffix}</span>
    </div>
  )
}

const HELP: Record<string, { en: string; tl: string }> = {
  profit: {
    en: "This is how much money you actually keep from each sale — after paying the platform, affiliates, tax, and all your costs. If it's negative, you're losing money on every item you sell.",
    tl: "Ito ang pera na talagang natitirang sa iyo mula sa bawat benta — pagkatapos bayaran ang platform, affiliates, tax, at lahat ng gastos mo. Kung negatibo ito, nangangahulugang lugi ka sa bawat item na naibenta mo."
  },
  margin: {
    en: "This shows what percentage of your selling price is actual profit. Example: ₱100 selling price with 20% margin means you keep ₱20. Aim for at least 20–30% for a healthy online business.",
    tl: "Ito ang porsyento ng iyong presyo na talagang kita mo. Halimbawa: kung ang presyo ay ₱100 at 20% ang margin, ₱20 ang natitirang kita mo. Subukan na ma-achieve ang hindi bababa sa 20–30% para sa maayos na negosyo."
  },
  payout: {
    en: "This is the actual cash the platform (Shopee, TikTok Shop, Lazada) deposits into your account per item sold — after their fees. This is NOT your profit yet. You still need to subtract your product costs from this.",
    tl: "Ito ang talagang pera na idedeposito ng platform (Shopee, TikTok Shop, Lazada) sa iyong account bawat benta — pagkatapos ng kanilang bayarin. Hindi pa ito ang iyong kita. Kailangan mo pang ibawas ang iyong gastos sa produkto dito."
  },
  suggested: {
    en: "A quick price suggestion using the '3× cost rule' — a popular starting point for online sellers. It means charging 3 times what the item costs you. This usually covers all fees and leaves a decent profit.",
    tl: "Isang mabilis na mungkahing presyo gamit ang '3× cost rule' — sikat na simula para sa mga online sellers. Ang ibig sabihin ay magbenta ng 3 beses ng gastos mo sa produkto. Kadalasan sumasaklaw ito sa lahat ng bayarin at may matinong kita pa."
  },
  cost: {
    en: "This is the TOTAL cost to sell ONE item — not just what you paid for it, but everything combined: product cost, defect waste, packaging, labor, your share of ad spend, and any extra costs you added.",
    tl: "Ito ang KABUUANG gastos para maibenta ang ISANG item — hindi lang ang binayad mo para dito, kundi lahat: halaga ng produkto, nasayang na items, packaging, labor, bahagi ng gastos sa ads, at iba pang gastos."
  },
  ads: {
    en: "Your total monthly ad budget divided across all your monthly sales. The higher this is relative to your profit per item, the harder it is to make money from advertising.",
    tl: "Ang iyong kabuuang buwanang budget sa ads na hinati sa lahat ng iyong buwanang benta. Habang mas mataas ito kumpara sa iyong kita bawat item, mas mahirap kumita mula sa advertising."
  },
  roi: {
    en: "ROI means Return on Investment. It tells you how much profit you make compared to how much money you spend each month. Example: if you spend ₱10,000 on products, packaging, labor, and ads, and you earn ₱3,000 profit — your ROI is 30%. Higher is better! Aim for at least 20–50% for a healthy business.",
    tl: "Ang ROI ay ibig sabihin ay Return on Investment — kung magkano ang kita mo kumpara sa gastos mo bawat buwan. Halimbawa: kung gumastos ka ng ₱10,000 sa produkto, packaging, labor, at ads, at kumita ka ng ₱3,000 — ang ROI mo ay 30%. Mas mataas, mas magaling! Subukang maabot ang hindi bababa sa 20–50% para sa malusog na negosyo."
  },
  cogs: {
    en: "Enter what you pay to buy or make ONE unit of your product. If you buy from a supplier, enter the price per piece. If you make it yourself, enter the cost of materials per item.",
    tl: "Ilagay ang halagang binabayaran mo para mabili o magawa ang ISANG piraso ng iyong produkto. Kung bumibili ka sa supplier, ilagay ang presyo bawat piraso. Kung ginagawa mo mismo, ilagay ang halaga ng materyales bawat item."
  },
  defect: {
    en: "Some items get damaged, lost, or returned and can't be sold. Enter the percentage this happens. Example: if 2 out of every 100 items go to waste, enter 2. Those wasted items add extra cost to every successful sale.",
    tl: "May mga item na nasira, nawawala, o nire-return at hindi na mabenta. Ilagay ang porsyento na nangyayari ito. Halimbawa: kung 2 sa bawat 100 items ang nasasayang, ilagay ang 2. Ang mga nasayang na items na iyon ay nagdadagdag ng gastos sa bawat matagumpay na benta."
  },
  'return-fee': {
    en: "When a customer returns an item, the platform may charge you a processing or handling fee on top of refunding the sale. Enter the peso amount the platform charges per returned order.",
    tl: "Kapag nag-return ang customer, maaaring magsingil ang platform ng processing o handling fee bukod sa ibabalik na bayad. Ilagay ang halagang sinisingil ng platform bawat nire-return na order."
  },
  platform: {
    en: "Every platform takes a cut of your sales as their fee. Shopee is around 25%, TikTok Shop around 8%. Check your seller dashboard for your exact rate. This is deducted from your selling price before you receive anything.",
    tl: "Bawat platform ay kumukuha ng bahagi ng iyong benta bilang kanilang bayad. Ang Shopee ay mga 25%, ang TikTok Shop ay mga 8%. Tingnan ang iyong seller dashboard para sa iyong eksaktong rate. Ibinabawas ito sa iyong presyo bago ka makatanggap ng pera."
  },
  affiliate: {
    en: "If content creators or influencers promote your product and earn a commission per sale they bring in, enter their rate here. If you don't use affiliates at all, just leave this at 0.",
    tl: "Kung may mga content creator o influencer na nagpo-promote ng iyong produkto at kumikita ng komisyon bawat benta na nagmula sa kanila, ilagay ang kanilang rate dito. Kung hindi ka gumagamit ng affiliates, iwanan lang itong 0."
  },
  tax: {
    en: "If you're a registered business, you may need to pay VAT (12% in the Philippines) or income tax on your sales. If you're not yet registered or don't pay tax on your online sales, leave this at 0.",
    tl: "Kung rehistrado kang negosyo, maaaring kailangan mong magbayad ng VAT (12% sa Pilipinas) o income tax. Kung hindi ka pa rehistrado o hindi ka nagbabayad ng tax sa iyong mga benta, iwanan lang itong 0."
  },
  adspend: {
    en: "Enter your total monthly advertising budget across all platforms — Facebook, TikTok, Shopee Ads, etc. The calculator splits this cost across all your monthly sales so you can see exactly how much ads add to your cost per item sold.",
    tl: "Ilagay ang iyong kabuuang buwanang budget sa advertising sa lahat ng platform — Facebook, TikTok, Shopee Ads, atbp. Hinahati ng calculator ang gastos na ito sa lahat ng iyong buwanang benta para makita mo kung magkano ang idinaragdag ng ads sa iyong gastos bawat item."
  },
  packaging: {
    en: "The cost of materials to pack one order — boxes, poly bags, bubble wrap, stickers, tape, thank-you cards, etc. Even small amounts add up across hundreds of orders, so try to include everything.",
    tl: "Ang gastos ng mga materyales para i-pack ang isang order — kahon, poly bag, bubble wrap, stickers, tape, thank-you cards, atbp. Kahit maliit ang bawat isa, nagdaragdag ito sa daan-daang orders, kaya subukang isama ang lahat."
  },
  labor: {
    en: "Your time has value! Enter the labor cost to prepare one item — packing, checking quality, etc. If it's just you doing the work, estimate your hourly rate and divide by how many items you can prepare per hour.",
    tl: "May halaga ang iyong oras! Ilagay ang gastos sa labor para maghanda ng isang item — pag-pack, quality check, atbp. Kung ikaw lang ang gumagawa, tantiyahin ang iyong hourly rate at hatiin sa bilang ng items na maaari mong ihanda bawat oras."
  },
  'monthly-labor': {
    en: "Enter your total monthly labor expenses — salaries, helpers, packers, freelancers, etc. The calculator automatically divides this by your monthly sales target to find out how much labor costs you per item sold.",
    tl: "Ilagay ang iyong kabuuang buwanang gastos sa labor — sahod, helpers, packers, freelancers, atbp. Awtomatikong hinahati ng calculator ito sa iyong buwanang target na benta para malaman kung magkano ang gastos sa labor bawat item na naibenta."
  },
  price: {
    en: "This is the price your customer sees and pays. After entering this, the calculator will show if you're making a profit, breaking even, or losing money at that price.",
    tl: "Ito ang presyong nakikita at binabayaran ng iyong customer. Pagkatapos ilagay ito, ipapakita ng calculator kung kumikita ka, break-even, o lugi ka sa presyong iyon."
  },
  units: {
    en: "How many items do you plan to sell in a month? This is used to calculate your monthly profit and to spread your ad costs fairly across each sale.",
    tl: "Ilang item ang plano mong ibenta sa isang buwan? Ginagamit ito para kalkulahin ang iyong buwanang kita at para pantay na hatiin ang iyong gastos sa ads sa bawat benta."
  },
  'payout-weeks': {
    en: "Platforms don't pay you right away — they hold your money for a few weeks first. Enter how many weeks before you typically get paid. Shopee and Lazada are usually 2–3 weeks. This affects how much cash you need on hand.",
    tl: "Hindi ka agad binabayaran ng platform — hawak nila ang iyong pera ng ilang linggo muna. Ilagay kung ilang linggo bago ka karaniwang mabayaran. Ang Shopee at Lazada ay karaniwang 2–3 linggo. Nakakaapekto ito sa kung magkano ang pera na kailangan mong handa."
  },
  bep: {
    en: "This is the MINIMUM price you must charge just to avoid losing money. Sell below this and every order loses you money. It's calculated from all your costs and fees combined.",
    tl: "Ito ang PINAKAMABABANG presyo na kailangan mong isingil para hindi ka lugi. Kung magbenta ka ng mas mababa rito, bawat order ay nagpapalapit sa iyo ng pagkalugi. Kinakalkula ito mula sa lahat ng iyong gastos at bayarin."
  },
  'monthly-revenue': {
    en: "This is the total amount your customers pay you in a month — your selling price × monthly units. This is NOT your profit. It's the gross sales total before any costs or fees are taken out.",
    tl: "Ito ang kabuuang halagang binabayaran ng iyong mga customer sa iyo sa isang buwan — presyo mo × buwanang benta. Hindi ito ang iyong kita. Ito ang kabuuang benta bago pa ibawas ang anumang gastos o bayarin."
  },
  'monthly-inventory': {
    en: "This is how much cash you need every month just to buy or make your stock — your product cost (COGS) plus defective/wasted items, multiplied by your monthly units.",
    tl: "Ito ang halaga ng pera na kailangan mo bawat buwan para mabili o magawa ang iyong stock — ang halaga ng produkto (COGS) kasama ang mga nasayang na items, pinarami sa iyong buwanang benta."
  },
  capital: {
    en: "Because platforms pay you weeks later, you need your own money upfront to keep buying stock while you wait. This is how much cash you need available so your business doesn't stop while waiting to get paid.",
    tl: "Dahil babayaran ka ng platform pagkalipas ng ilang linggo, kailangan mo ng sariling pera para mapatuloy ang pagbili ng stock habang naghihintay. Ito ang halaga ng pera na kailangan mong laging handa para hindi tumigil ang iyong negosyo habang naghihintay ng bayad."
  },
}

function HelpBox({ id, lang }: { id: string; lang: 'en'|'tl' }) {
  const [open, setOpen] = useState(false)
  const text = HELP[id]?.[lang]
  if (!text) return null
  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity" style={{ color:'var(--accent)', background:'none', border:'none', padding:0, cursor:'pointer' }}>
        ? What is this?
      </button>
      {open && (
        <div className="mt-2 p-3 text-xs leading-relaxed rounded-r-lg border-l-2" style={{ background:'rgba(59,97,198,0.06)', borderColor:'var(--accent)', color:'var(--text2)' }}>
          {text}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color, accent, large, helpId, helpLang }: { label: string; value: string; sub?: string; color: string; accent: string; large?: boolean; helpId?: string; helpLang?: 'en'|'tl' }) {
  return (
    <div className="relative rounded-2xl border p-5 overflow-hidden" style={{ background:'var(--surface)', borderColor:'var(--border)', boxShadow:'0 2px 8px rgba(59,97,198,0.06)' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60"
        style={{ background: accent==='green'?'var(--green)':accent==='red'?'var(--red)':accent==='yellow'?'var(--yellow)':'var(--accent)' }} />
      <div className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color:'var(--text3)' }}>{label}</div>
      <div className={`mono font-semibold leading-tight break-all ${large?'text-2xl sm:text-3xl':'text-xl sm:text-2xl'}`} style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1.5" style={{ color:'var(--text3)' }}>{sub}</div>}
      {helpId && helpLang && <HelpBox id={helpId} lang={helpLang} />}
    </div>
  )
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold transition-all"
      style={{ background:'var(--surface)', borderColor:'var(--border2)', color:'var(--text2)' }}>
      {children}
    </button>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="w-full max-w-md rounded-2xl border p-7 shadow-2xl" style={{ background:'var(--surface)', borderColor:'var(--border2)' }}>
        {children}
      </div>
    </div>
  )
}
