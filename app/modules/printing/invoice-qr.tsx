// @ts-expect-error - The TS types for react-qr-code are not up to date
import { QRCode } from 'react-qr-code';

export function InvoiceQr({ url }: { url: string }) {
	return <QRCode value={url} size={128} />;
}
