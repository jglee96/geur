use crate::config::resolve_api_key;
use crate::fs_tree::{build_tree, ensure_not_root, resolve_root, resolve_within_root, FileNode};
use crate::infra_openai::OpenAiClient;
use crate::prompts;
use serde::Deserialize;
use std::fs;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptAttachment {
    pub token: String,
    pub name: String,
    pub content: String,
    pub source: String,
}

#[tauri::command]
pub async fn rewrite_text(
    model: String,
    prompt: String,
    selected_text: String,
    api_key: Option<String>,
    attachments: Option<Vec<PromptAttachment>>,
) -> Result<String, String> {
    let api_key = resolve_api_key(api_key)?;
    let language_profile = prompts::detect_language_profile(&selected_text);
    let system_prompt = prompts::compose_system_prompt(language_profile);
    let input_attachments = attachments
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .map(|attachment| prompts::PromptAttachmentInput {
            token: &attachment.token,
            name: &attachment.name,
            content: &attachment.content,
            source: &attachment.source,
        })
        .collect::<Vec<_>>();
    let input_text =
        prompts::rewrite_input(&prompt, &selected_text, "deep_rewrite", &input_attachments);
    let client = OpenAiClient::new();

    client
        .rewrite_text(&model, &system_prompt, &input_text, &api_key)
        .await
}

#[tauri::command]
pub async fn list_tree(root_path: String) -> Result<FileNode, String> {
    let root = resolve_root(&root_path)?;
    build_tree(&root, &root)
}

#[tauri::command]
pub async fn create_file(root_path: String, relative_path: String) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
    ensure_not_root(&relative_path)?;
    let target = resolve_within_root(&root, &relative_path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    fs::write(&target, "").map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn create_folder(root_path: String, relative_path: String) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
    ensure_not_root(&relative_path)?;
    let target = resolve_within_root(&root, &relative_path)?;
    fs::create_dir_all(&target).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_path(root_path: String, relative_path: String) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
    ensure_not_root(&relative_path)?;
    let target = resolve_within_root(&root, &relative_path)?;
    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|err| err.to_string())?;
    } else if target.is_file() {
        fs::remove_file(&target).map_err(|err| err.to_string())?;
    } else {
        return Err("대상을 찾지 못했습니다.".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn rename_path(
    root_path: String,
    from: String,
    to: String,
) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
    ensure_not_root(&from)?;
    ensure_not_root(&to)?;
    let source = resolve_within_root(&root, &from)?;
    let target = resolve_within_root(&root, &to)?;
    fs::rename(&source, &target).map_err(|err| err.to_string())?;
    Ok(())
}
