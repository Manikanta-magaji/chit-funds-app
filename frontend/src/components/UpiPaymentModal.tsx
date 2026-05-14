import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  winnerName: string;
  winnerUpiId: string;
  amount: number;
  groupName: string;
  cycleNumber: number;
  onClose: () => void;
  breakdown?: { label: string; amount: number }[];
}

export default function UpiPaymentModal({
  winnerName,
  winnerUpiId,
  amount,
  groupName,
  cycleNumber,
  onClose,
  breakdown,
}: Props) {
  const note = `Chit fund payment - ${groupName} cycle ${cycleNumber}`;
  const upiUri =
    `upi://pay?pa=${encodeURIComponent(winnerUpiId)}` +
    `&pn=${encodeURIComponent(winnerName)}` +
    `&am=${amount}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(note)}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="upi-modal-backdrop" onClick={onClose}>
      <div className="upi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upi-modal-header">
          <h3>Pay {winnerName}</h3>
          <button className="upi-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="upi-modal-body">
          <div className="upi-qr-wrapper">
            <QRCodeSVG value={upiUri} size={220} level="M" />
          </div>

          {breakdown && breakdown.length >= 2 && (
            <ul className="upi-breakdown">
              {breakdown.map((row, i) => (
                <li key={i} className="upi-breakdown-row">
                  <span className="upi-breakdown-label">{row.label}</span>
                  <span className="upi-breakdown-amount">₹{row.amount.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="upi-amount">
            {breakdown && breakdown.length >= 2 ? "Total: " : ""}₹{amount.toLocaleString()}
          </p>

          <a href={upiUri} className="btn btn-upi" rel="noopener noreferrer">
            Open in UPI App
          </a>

          <p className="upi-note">
            Scan the QR code or tap the button to pay via your UPI app. On desktop, use the QR code with your phone.
          </p>
          <p className="upi-sub-note">
            Verify amount with your group admin if you share a slot.
          </p>
        </div>
      </div>
    </div>
  );
}
