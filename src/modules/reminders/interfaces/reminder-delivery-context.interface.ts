export interface ReminderDeliveryContext {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string;
}
