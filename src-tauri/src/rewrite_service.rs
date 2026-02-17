use crate::config::resolve_api_key;
use crate::infra_openai::{OpenAiClient, RewriteResponse};
use crate::prompts;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptAttachment {
    pub token: String,
    pub name: String,
    pub content: String,
    pub source: String,
}

pub struct RewriteTextRequest {
    pub model: String,
    pub prompt: String,
    pub selected_text: String,
    pub api_key: Option<String>,
    pub attachments: Vec<PromptAttachment>,
}

pub async fn rewrite_text(request: RewriteTextRequest) -> Result<RewriteResponse, String> {
    let api_key = resolve_api_key(request.api_key)?;
    let language_profile = prompts::detect_language_profile(&request.selected_text);
    let system_prompt = prompts::compose_system_prompt(language_profile);
    let prompt_attachments = request
        .attachments
        .iter()
        .map(|attachment| prompts::PromptAttachmentInput {
            token: &attachment.token,
            name: &attachment.name,
            content: &attachment.content,
            source: &attachment.source,
        })
        .collect::<Vec<_>>();
    let input_text = prompts::rewrite_input(
        &request.prompt,
        &request.selected_text,
        "deep_rewrite",
        &prompt_attachments,
    );
    let client = OpenAiClient::new();
    client
        .rewrite_text(&request.model, &system_prompt, &input_text, &api_key)
        .await
}
