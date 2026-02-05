pub fn resolve_api_key(payload_key: Option<String>) -> Result<String, String> {
    let key = if let Some(value) = payload_key {
        value
    } else {
        std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY가 필요합니다.".to_string())?
    };

    let trimmed = key.trim();
    if trimmed.is_empty() {
        return Err("API 키가 비어 있습니다.".to_string());
    }

    Ok(trimmed.to_string())
}
