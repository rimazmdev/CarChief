import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface AuditLogEntry {
  id?: string;
  action: string;
  performedBy: string;
  details: Record<string, any>;
  timestamp: string;
}

export async function logAuditTrail(entry: Omit<AuditLogEntry, 'timestamp'>) {
  console.log('[Audit Log]', {
    ...entry,
    timestamp: new Date().toISOString()
  });
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  return [];
}

export async function auditedAddDoc(...args: any[]) {
  const collectionRef = args[0];
  const data = args[1];
  const result = await addDoc(collectionRef, data);
  await logAuditTrail({
    action: 'CREATE',
    performedBy: 'user',
    details: { docId: result.id, data }
  });
  return result;
}

export async function auditedUpdateDoc(...args: any[]) {
  const docRef = args[0];
  const data = args[1];
  await updateDoc(docRef, data);
  await logAuditTrail({
    action: 'UPDATE',
    performedBy: 'user',
    details: { docId: docRef?.id, data }
  });
}

export async function auditedDeleteDoc(...args: any[]) {
  const docRef = args[0];
  await deleteDoc(docRef);
  await logAuditTrail({
    action: 'DELETE',
    performedBy: 'user',
    details: { docId: docRef?.id }
  });
}
