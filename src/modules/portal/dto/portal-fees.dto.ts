export interface PortalFeePaymentProofDto {
  id: string;
  title: string;
  notes: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  submittedAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

export interface PortalFeeRecordDto {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  pendingAmount: number;
  status: string;
  paidAt: Date | null;
  remarks: string | null;
  paymentMethod: string | null;
  proofs: PortalFeePaymentProofDto[];
}
