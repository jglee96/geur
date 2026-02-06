use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

fn sort_entries(a: &FileNode, b: &FileNode) -> Ordering {
    match (a.is_dir, b.is_dir) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    }
}

pub fn build_tree(root: &Path, current: &Path) -> Result<FileNode, String> {
    let name = current
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("/")
        .to_string();
    let relative = current
        .strip_prefix(root)
        .map_err(|_| "경로가 루트 밖입니다.".to_string())?;
    let path = if relative.as_os_str().is_empty() {
        "/".to_string()
    } else {
        relative.to_string_lossy().to_string()
    };

    let mut children = Vec::new();
    if current.is_dir() {
        for entry in fs::read_dir(current).map_err(|err| err.to_string())? {
            let entry = entry.map_err(|err| err.to_string())?;
            let child_path = entry.path();
            let child = build_tree(root, &child_path)?;
            children.push(child);
        }
        children.sort_by(sort_entries);
    }

    Ok(FileNode {
        name,
        path,
        is_dir: current.is_dir(),
        children: if children.is_empty() { None } else { Some(children) },
    })
}

pub fn resolve_root(path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(path);
    let canonical = root
        .canonicalize()
        .map_err(|_| "폴더 경로를 찾을 수 없습니다.".to_string())?;
    if !canonical.is_dir() {
        return Err("폴더가 아닙니다.".to_string());
    }
    Ok(canonical)
}

pub fn resolve_within_root(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = relative.trim_start_matches('/');
    let joined = root.join(rel);
    let parent = joined
        .parent()
        .ok_or_else(|| "경로가 잘못되었습니다.".to_string())?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|_| "상위 폴더를 찾을 수 없습니다.".to_string())?;
    if !canonical_parent.starts_with(root) {
        return Err("루트 밖 경로입니다.".to_string());
    }
    Ok(joined)
}
