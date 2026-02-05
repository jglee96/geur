use crate::config::resolve_api_key;
use crate::infra_openai::OpenAiClient;

const SYSTEM_PROMPT: &str =
    "당신은 글을 명확하고 자연스럽게 다듬는 편집자입니다. 수정된 문장만 반환하세요.";

#[tauri::command]
pub async fn rewrite_text(
    model: String,
    prompt: String,
    selected_text: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let api_key = resolve_api_key(api_key)?;

    let input_text = format!("요청: {}\n\n문장:\n{}", prompt, selected_text);
    let client = OpenAiClient::new();

    client
        .rewrite_text(&model, SYSTEM_PROMPT, &input_text, &api_key)
        .await
}
