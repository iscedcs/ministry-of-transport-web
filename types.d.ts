type DocumentReviewEntry = {
  id: string;
  reviewedByUserId: string;
  reviewerName: string;
  reviewerRole: string;
  isApproved: boolean;
  notes: string | null;
  reviewedAt: Date;
};

type ParkDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  verifiedAt?: Date | null;
  verifiedByUserId?: string | null;
  verificationNotes?: string | null;
  reviews: DocumentReviewEntry[];
};
