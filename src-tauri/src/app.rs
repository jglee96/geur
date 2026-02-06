use crate::config::resolve_api_key;
use crate::fs_tree::{build_tree, resolve_root, resolve_within_root, FileNode};
use crate::infra_openai::OpenAiClient;
use std::fs;

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

#[tauri::command]
pub async fn list_tree(root_path: String) -> Result<FileNode, String> {
    let root = resolve_root(&root_path)?;
    build_tree(&root, &root)
}

#[tauri::command]
pub async fn create_file(root_path: String, relative_path: String) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
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
    let target = resolve_within_root(&root, &relative_path)?;
    fs::create_dir_all(&target).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_path(root_path: String, relative_path: String) -> Result<(), String> {
    let root = resolve_root(&root_path)?;
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
    let source = resolve_within_root(&root, &from)?;
    let target = resolve_within_root(&root, &to)?;
    fs::rename(&source, &target).map_err(|err| err.to_string())?;
    Ok(())
}
