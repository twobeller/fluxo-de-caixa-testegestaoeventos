export function formatarMoeda(valor: number | null | undefined): string {
  const num = typeof valor === 'number' && !isNaN(valor) ? valor : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatarData(dataStr: string | null | undefined): string {
  if (!dataStr) return '—'
  const parts = dataStr.split('-')
  if (parts.length === 3) {
    const [ano, mes, dia] = parts
    return `${dia}/${mes}/${ano}`
  }
  const d = new Date(dataStr)
  if (isNaN(d.getTime())) return dataStr
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatarDataExtenso(dataStr: string | null | undefined): string {
  if (!dataStr) return '—'
  const parts = dataStr.split('-')
  let d: Date
  if (parts.length === 3) {
    d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  } else {
    d = new Date(dataStr)
  }
  if (isNaN(d.getTime())) return dataStr
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatarBytes(bytes: number, decimais = 1): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimais < 0 ? 0 : decimais
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
