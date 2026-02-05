use serde::Deserialize;
use serde_json::json;

#[tauri::command]
async fn rewrite_text(
    model: String,
    prompt: String,
    selected_text: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let api_key = if let Some(value) = api_key {
        if value.trim().is_empty() {
            String::new()
        } else {
            value
        }
    } else {
        std::env::var("OPENAI_API_KEY")
            .map_err(|_| "OPENAI_API_KEY가 필요합니다.")?
    };

    if api_key.trim().is_empty() {
        return Err("API 키가 비어 있습니다.".to_string());
    }

    let system_prompt = "당신은 글을 명확하고 자연스럽게 다듬는 편집자입니다. 수정된 문장만 반환하세요.";
    let input_text = format!("요청: {}\n\n문장:\n{}", prompt, selected_text);

    let body = json!({
        "model": model,
        "instructions": system_prompt,
        "input": input_text
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/responses")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|err| err.to_string())?;

    let status = response.status();
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|err| err.to_string())?;

    if !status.is_success() {
        return Err(format!("OpenAI 오류: {}", value));
    }

    if let Some(text) = value.get("output_text").and_then(|val| val.as_str()) {
        return Ok(text.to_string());
    }

    if let Some(output) = value.get("output").and_then(|val| val.as_array()) {
        for item in output {
            if item.get("type").and_then(|val| val.as_str()) == Some("message") {
                if let Some(content) = item.get("content").and_then(|val| val.as_array()) {
                    for piece in content {
                        if piece.get("type").and_then(|val| val.as_str())
                            == Some("output_text")
                        {
                            if let Some(text) = piece.get("text").and_then(|val| val.as_str()) {
                                return Ok(text.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    Err("OpenAI 응답에서 텍스트를 찾지 못했습니다.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![rewrite_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
