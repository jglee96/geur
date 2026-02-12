const SYSTEM_PROMPT: &str = include_str!("../prompts/system.md");
const STYLE_PROFILE: &str = include_str!("../prompts/style-profile.md");
const KO_PROFILE: &str = include_str!("../prompts/language-profile/ko.md");
const EN_PROFILE: &str = include_str!("../prompts/language-profile/en.md");
const GENERIC_PROFILE: &str = include_str!("../prompts/language-profile/generic.md");
const REWRITE_INPUT_TEMPLATE: &str = include_str!("../prompts/rewrite-input.md");

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

pub fn rewrite_input(user_prompt: &str, selected_text: &str, mode: &str) -> String {
    REWRITE_INPUT_TEMPLATE
        .replace("{{rewrite_mode}}", mode)
        .replace("{{user_prompt}}", user_prompt)
        .replace("{{selected_text}}", selected_text)
}
