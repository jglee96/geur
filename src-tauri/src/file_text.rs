use std::fs;
use std::path::Path;

pub fn read_any(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|err| err.to_string())
}

pub fn write_any(path: &str, content: &str) -> Result<(), String> {
    let target = Path::new(path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    fs::write(target, content).map_err(|err| err.to_string())
}
