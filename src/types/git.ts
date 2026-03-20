export interface GitStatus {
  has_changes: boolean;
  ahead: number;
  behind: number;
  branch: string;
  has_remote: boolean;
}

export interface SyncResult {
  success: boolean;
  message: string;
}
