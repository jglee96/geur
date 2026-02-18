const SYSTEM_PROMPT: &str = include_str!("../prompts/system.md");
const STYLE_PROFILE: &str = include_str!("../prompts/style-profile.md");
const KO_PROFILE: &str = include_str!("../prompts/language-profile/ko.md");
const EN_PROFILE: &str = include_str!("../prompts/language-profile/en.md");
const GENERIC_PROFILE: &str = include_str!("../prompts/language-profile/generic.md");
const REWRITE_INPUT_TEMPLATE: &str = include_str!("../prompts/rewrite-input.md");
const SUGGEST_SYSTEM_PROMPT: &str = include_str!("../prompts/suggest-system.md");
const SUGGEST_INPUT_TEMPLATE: &str = include_str!("../prompts/suggest-input.md");

pub struct PromptAttachmentInput<'a> {
    pub token: &'a str,
    pub name: &'a str,
    pub content: &'a str,
    pub source: &'a str,
}

#[derive(Clone, Copy)]
pub enum LanguageProfile {
    Korean,
    English,
    Generic,
}

pub fn detect_language_profile(text: &str) -> LanguageProfile {
    let mut ko_count = 0usize;
    let mut latin_count = 0usize;

    for ch in text.chars() {
        let cp = ch as u32;
        if (0xAC00..=0xD7A3).contains(&cp) || (0x1100..=0x11FF).contains(&cp) {
            ko_count += 1;
        } else if ch.is_ascii_alphabetic() {
            latin_count += 1;
        }
    }

    if ko_count >= latin_count.saturating_mul(2).max(8) {
        LanguageProfile::Korean
    } else if latin_count >= ko_count.saturating_mul(2).max(12) {
        LanguageProfile::English
    } else {
        LanguageProfile::Generic
    }
}

pub fn compose_system_prompt(profile: LanguageProfile) -> String {
    let language_profile = match profile {
        LanguageProfile::Korean => KO_PROFILE,
        LanguageProfile::English => EN_PROFILE,
        LanguageProfile::Generic => GENERIC_PROFILE,
    };

    format!(
        "{system}\n\n{style}\n\n{lang}",
        system = SYSTEM_PROMPT.trim(),
        style = STYLE_PROFILE.trim(),
        lang = language_profile.trim()
    )
}

pub fn compose_suggest_system_prompt(profile: LanguageProfile) -> String {
    let language_profile = match profile {
        LanguageProfile::Korean => KO_PROFILE,
        LanguageProfile::English => EN_PROFILE,
        LanguageProfile::Generic => GENERIC_PROFILE,
    };

    format!(
        "{suggest}\n\n{lang}",
        suggest = SUGGEST_SYSTEM_PROMPT.trim(),
        lang = language_profile.trim(),
    )
}

fn format_attachments(attachments: &[PromptAttachmentInput<'_>]) -> String {
    if attachments.is_empty() {
        return "None".to_string();
    }

    attachments
        .iter()
        .map(|attachment| {
            let content = attachment.content.replace("\r\n", "\n");
            let content_block = content
                .lines()
                .map(|line| format!("    {}", line))
                .collect::<Vec<_>>()
                .join("\n");
            format!(
                "- token: {token}\n  name: {name}\n  source: {source}\n  content:\n{content}",
                token = attachment.token,
                name = attachment.name,
                source = attachment.source,
                content = if content_block.is_empty() {
                    "    (empty)".to_string()
                } else {
                    content_block
                }
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

pub fn rewrite_input(
    user_prompt: &str,
    selected_text: &str,
    mode: &str,
    attachments: &[PromptAttachmentInput<'_>],
) -> String {
    REWRITE_INPUT_TEMPLATE
        .replace("{{rewrite_mode}}", mode)
        .replace("{{attachments}}", &format_attachments(attachments))
        .replace("{{user_prompt}}", user_prompt)
        .replace("{{selected_text}}", selected_text)
}

pub fn suggest_input(before_text: &str, after_text: &str) -> String {
    SUGGEST_INPUT_TEMPLATE
        .replace("{{before_text}}", before_text)
        .replace("{{after_text}}", after_text)
}
