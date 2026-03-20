use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GitStatus {
    pub has_changes: bool,
    pub ahead: u32,
    pub behind: u32,
    pub branch: String,
    pub has_remote: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
}
