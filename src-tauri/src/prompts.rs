const SYSTEM_PROMPT: &str = include_str!("../prompts/system.md");
const REWRITE_INPUT_TEMPLATE: &str = include_str!("../prompts/rewrite-input.md");

pub fn system_prompt() -> &'static str {
    SYSTEM_PROMPT
}

pub fn rewrite_input(user_prompt: &str, selected_text: &str) -> String {
    REWRITE_INPUT_TEMPLATE
        .replace("{{user_prompt}}", user_prompt)
        .replace("{{selected_text}}", selected_text)
}
