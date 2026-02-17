use serde::Serialize;
use serde_json::json;

pub struct OpenAiClient {
    http: reqwest::Client,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RewriteResponse {
    pub suggested_text: Option<String>,
    pub user_error: Option<String>,
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
    ) -> Result<RewriteResponse, String> {
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

        let mut output_text = value
            .get("output_text")
            .and_then(|val| val.as_str())
            .map(|text| text.to_string());

        let mut refusal_message: Option<String> = None;

        if let Some(output) = value.get("output").and_then(|val| val.as_array()) {
            for item in output {
                if item.get("type").and_then(|val| val.as_str()) == Some("message") {
                    if let Some(content) = item.get("content").and_then(|val| val.as_array()) {
                        for piece in content {
                            match piece.get("type").and_then(|val| val.as_str()) {
                                Some("output_text") => {
                                    if output_text.is_none() {
                                        output_text = piece
                                            .get("text")
                                            .and_then(|val| val.as_str())
                                            .map(|text| text.to_string());
                                    }
                                }
                                Some("refusal") => {
                                    if refusal_message.is_none() {
                                        refusal_message = piece
                                            .get("refusal")
                                            .and_then(|val| val.as_str())
                                            .map(|msg| msg.to_string());
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        }

        let incomplete_reason = value
            .get("incomplete_details")
            .and_then(|details| details.get("reason"))
            .and_then(|reason| reason.as_str());

        if incomplete_reason == Some("content_filter") || refusal_message.is_some() {
            let message = refusal_message.unwrap_or_else(|| {
                "선택한 문장이 안전 정책에 걸려 수정안을 생성할 수 없어요. 표현을 완화해 다시 시도해 주세요."
                    .to_string()
            });
            return Ok(RewriteResponse {
                suggested_text: None,
                user_error: Some(message),
            });
        }

        if let Some(text) = output_text {
            return Ok(RewriteResponse {
                suggested_text: Some(text),
                user_error: None,
            });
        }

        Err("OpenAI 응답에서 수정안 또는 오류 메시지를 찾지 못했습니다.".to_string())
    }
}
