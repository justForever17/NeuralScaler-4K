use std::path::{Path, PathBuf};
use std::fs;

#[allow(dead_code)]
pub struct PathResolver;

impl PathResolver {
    pub fn resolve_output_dir(user_specified: Option<&str>, input_file: &str) -> PathBuf {
        // Tier 1: User specified valid directory
        if let Some(user_dir) = user_specified {
            let p = PathBuf::from(user_dir);
            if fs::create_dir_all(&p).is_ok() {
                return p;
            }
        }

        // Tier 2: Input file directory / output_4k/
        let input_path = Path::new(input_file);
        if let Some(parent) = input_path.parent() {
            let default_dir = parent.join("output_4k");
            if fs::create_dir_all(&default_dir).is_ok() {
                return default_dir;
            }
        }

        // Tier 3: %USERPROFILE%\Videos\NeuralScaler\
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let user_video_dir = PathBuf::from(profile).join("Videos").join("NeuralScaler");
            let _ = fs::create_dir_all(&user_video_dir);
            return user_video_dir;
        }

        PathBuf::from(".\\output_4k")
    }

    pub fn generate_unique_filename(target_dir: &Path, base_name: &str, ext: &str) -> PathBuf {
        let mut candidate = target_dir.join(format!("{}{}", base_name, ext));
        let mut counter = 1;
        while candidate.exists() {
            candidate = target_dir.join(format!("{} ({}){}", base_name, counter, ext));
            counter += 1;
        }
        candidate
    }
}
