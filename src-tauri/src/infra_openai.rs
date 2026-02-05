use serde_json::json;

pub struct OpenAiClient {
    http: reqwest::Client,
}

impl OpenAiClient {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    pub async fn rewrite_text(
        &self,
        model: &str,
        system_prompt: &str,
        input_text: &str,
        api_key: &str,
    ) -> Result<String, String> {
        let body = json!({
            "model": model,
            "instructions": system_prompt,
            "input": input_text
        });

        let response = self
            .http
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
}
