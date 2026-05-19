export function formatIndian(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function below1000(n: number): string {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  }

  const n = Math.floor(amount);
  if (n === 0) return 'Zero Rupees';
  const parts: string[] = [];
  if (n >= 10000000) parts.push(below100(Math.floor(n / 10000000)) + ' Crore');
  const r1 = n % 10000000;
  if (r1 >= 100000) parts.push(below100(Math.floor(r1 / 100000)) + ' Lakh');
  const r2 = r1 % 100000;
  if (r2 >= 1000) parts.push(below1000(Math.floor(r2 / 1000)) + ' Thousand');
  const r3 = r2 % 1000;
  if (r3 > 0) parts.push(below1000(r3));
  return parts.join(' ') + ' Rupees';
}

export function displayDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}
